CREATE OR REPLACE FUNCTION calculate_match_score(
  target_tutor_id UUID,
  result_limit INT DEFAULT 10,
  max_distance_km NUMERIC DEFAULT 50
)
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
  tutor_location geography(POINT);
BEGIN
  SELECT custom_fields, location INTO tutor_fields, tutor_location
  FROM tutors
  WHERE id = target_tutor_id;

  IF tutor_fields IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH filtered_animals AS (
    SELECT animals.*
    FROM animals
    WHERE max_distance_km IS NULL
      OR tutor_location IS NULL
      OR animals.location IS NULL
      OR ST_DWithin(animals.location, tutor_location, max_distance_km * 1000)
  ),
  evaluated AS (
    SELECT
      filtered_animals.id AS animal_id,
      filtered_animals.name AS animal_name,
      rules.id AS rule_id,
      rules.rule_name,
      rules.weight,
      rules.is_dealbreaker,
      CASE rules.comparison_operator
        WHEN '=' THEN tutor_fields -> rules.tutor_field = filtered_animals.custom_fields -> rules.animal_field
        WHEN '!=' THEN tutor_fields -> rules.tutor_field <> filtered_animals.custom_fields -> rules.animal_field
        WHEN 'contains' THEN
          CASE
            WHEN jsonb_typeof(tutor_fields -> rules.tutor_field) = 'array'
              AND jsonb_typeof(filtered_animals.custom_fields -> rules.animal_field) = 'array'
              THEN EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(filtered_animals.custom_fields -> rules.animal_field) AS animal_item(value)
                WHERE tutor_fields -> rules.tutor_field ? animal_item.value
              )
            WHEN jsonb_typeof(tutor_fields -> rules.tutor_field) = 'array'
              THEN tutor_fields -> rules.tutor_field ? (filtered_animals.custom_fields ->> rules.animal_field)
            WHEN jsonb_typeof(filtered_animals.custom_fields -> rules.animal_field) = 'array'
              THEN EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(filtered_animals.custom_fields -> rules.animal_field) AS animal_item(value)
                WHERE tutor_fields ->> rules.tutor_field ILIKE '%' || animal_item.value || '%'
              )
            ELSE tutor_fields ->> rules.tutor_field ILIKE '%' || (filtered_animals.custom_fields ->> rules.animal_field) || '%'
          END
        WHEN '>=' THEN matching_value_rank(tutor_fields ->> rules.tutor_field) >= matching_value_rank(filtered_animals.custom_fields ->> rules.animal_field)
        WHEN '<=' THEN matching_value_rank(tutor_fields ->> rules.tutor_field) <= matching_value_rank(filtered_animals.custom_fields ->> rules.animal_field)
        ELSE false
      END AS matched
    FROM filtered_animals
    CROSS JOIN matching_rules rules
    WHERE rules.is_active = true
      AND tutor_fields ? rules.tutor_field
      AND filtered_animals.custom_fields ? rules.animal_field
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

CREATE OR REPLACE FUNCTION count_match_candidates_for_tutor(
  target_tutor_id UUID,
  max_distance_km NUMERIC DEFAULT 50
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tutor_location geography(POINT);
  total_candidates INT;
BEGIN
  SELECT location INTO tutor_location
  FROM tutors
  WHERE id = target_tutor_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INT INTO total_candidates
  FROM animals
  WHERE max_distance_km IS NULL
    OR tutor_location IS NULL
    OR animals.location IS NULL
    OR ST_DWithin(animals.location, tutor_location, max_distance_km * 1000);

  RETURN total_candidates;
END;
$$;

CREATE OR REPLACE FUNCTION match_animals_for_tutor(
  target_tutor_id UUID,
  result_limit INT DEFAULT 10,
  max_distance_km NUMERIC DEFAULT 50
)
RETURNS TABLE (
  animal_id UUID,
  animal_name TEXT,
  compatibility_score INT,
  matched_rules JSONB,
  details JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM calculate_match_score(target_tutor_id, result_limit, max_distance_km);
$$;
