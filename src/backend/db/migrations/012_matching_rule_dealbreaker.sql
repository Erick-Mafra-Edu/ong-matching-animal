ALTER TABLE matching_rules
  ADD COLUMN IF NOT EXISTS is_dealbreaker BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION matching_value_rank(raw_value TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw_value IS NULL THEN 0
    WHEN raw_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN raw_value::NUMERIC
    WHEN raw_value IN ('baixo', 'apartamento') THEN 1
    WHEN raw_value IN ('medio', 'casa_sem_quintal', 'casa_quintal_pequeno', 'casa_pequena') THEN 2
    WHEN raw_value IN ('alto', 'casa_com_quintal', 'casa_quintal_grande', 'casa_grande') THEN 3
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION match_animals_for_tutor(target_tutor_id UUID, result_limit INT DEFAULT 10)
RETURNS TABLE (
  animal_id UUID,
  animal_name TEXT,
  compatibility_score INT,
  matched_rules JSONB,
  details JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tutor_fields JSONB;
BEGIN
  SELECT custom_fields INTO tutor_fields
  FROM tutors
  WHERE id = target_tutor_id;

  IF tutor_fields IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH evaluated AS (
    SELECT
      animals.id AS animal_id,
      animals.name AS animal_name,
      rules.id AS rule_id,
      rules.rule_name,
      rules.weight,
      rules.is_dealbreaker,
      CASE rules.comparison_operator
        WHEN '=' THEN tutor_fields -> rules.tutor_field = animals.custom_fields -> rules.animal_field
        WHEN '!=' THEN tutor_fields -> rules.tutor_field <> animals.custom_fields -> rules.animal_field
        WHEN 'contains' THEN
          CASE
            WHEN jsonb_typeof(animals.custom_fields -> rules.animal_field) = 'array'
              THEN animals.custom_fields -> rules.animal_field ? (tutor_fields ->> rules.tutor_field)
            ELSE animals.custom_fields ->> rules.animal_field ILIKE '%' || (tutor_fields ->> rules.tutor_field) || '%'
          END
        WHEN '>=' THEN matching_value_rank(tutor_fields ->> rules.tutor_field) >= matching_value_rank(animals.custom_fields ->> rules.animal_field)
        WHEN '<=' THEN matching_value_rank(tutor_fields ->> rules.tutor_field) <= matching_value_rank(animals.custom_fields ->> rules.animal_field)
        ELSE false
      END AS matched
    FROM animals
    CROSS JOIN matching_rules rules
    WHERE rules.is_active = true
      AND tutor_fields ? rules.tutor_field
      AND animals.custom_fields ? rules.animal_field
  ),
  grouped AS (
    SELECT
      evaluated.animal_id,
      evaluated.animal_name,
      SUM(CASE WHEN evaluated.matched THEN evaluated.weight ELSE 0 END)::INT AS compatibility_score,
      BOOL_OR(evaluated.is_dealbreaker AND NOT evaluated.matched) AS disqualified,
      JSONB_AGG(evaluated.rule_id) FILTER (WHERE evaluated.matched) AS matched_rules,
      JSONB_AGG(JSONB_BUILD_OBJECT(
        'rule_id', evaluated.rule_id,
        'rule_name', evaluated.rule_name,
        'matched', evaluated.matched,
        'weight', evaluated.weight,
        'is_dealbreaker', evaluated.is_dealbreaker
      )) AS details
    FROM evaluated
    GROUP BY evaluated.animal_id, evaluated.animal_name
  )
  SELECT
    grouped.animal_id,
    grouped.animal_name,
    grouped.compatibility_score,
    COALESCE(grouped.matched_rules, '[]'::jsonb),
    COALESCE(grouped.details, '[]'::jsonb)
  FROM grouped
  WHERE grouped.disqualified = false
    AND grouped.compatibility_score > 0
  ORDER BY grouped.compatibility_score DESC, grouped.animal_name ASC
  LIMIT result_limit;
END;
$$;
