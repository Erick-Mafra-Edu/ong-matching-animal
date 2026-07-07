CREATE OR REPLACE FUNCTION compute_tutor_animal_matches(target_tutor_id UUID)
RETURNS TABLE (
  tutor_id UUID,
  animal_id UUID,
  compatibility_score INT,
  matched_rules JSONB,
  details JSONB
)
LANGUAGE sql
STABLE
AS $$
  WITH tutor_profile AS (
    SELECT tutors.id, tutors.custom_fields
    FROM tutors
    WHERE tutors.id = target_tutor_id
  ),
  evaluated AS (
    SELECT
      tutor_profile.id AS tutor_id,
      animals.id AS animal_id,
      rules.id AS rule_id,
      rules.rule_name,
      rules.weight,
      rules.is_dealbreaker,
      CASE
        WHEN NOT (tutor_profile.custom_fields ? rules.tutor_field)
          OR NOT (animals.custom_fields ? rules.animal_field)
          THEN false
        WHEN rules.comparison_operator = '='
          THEN tutor_profile.custom_fields -> rules.tutor_field = animals.custom_fields -> rules.animal_field
        WHEN rules.comparison_operator = '!='
          THEN tutor_profile.custom_fields -> rules.tutor_field <> animals.custom_fields -> rules.animal_field
        WHEN rules.comparison_operator = 'contains' THEN
          CASE
            WHEN jsonb_typeof(tutor_profile.custom_fields -> rules.tutor_field) = 'array'
              AND jsonb_typeof(animals.custom_fields -> rules.animal_field) = 'array'
              THEN EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(animals.custom_fields -> rules.animal_field) AS animal_item(value)
                WHERE tutor_profile.custom_fields -> rules.tutor_field ? animal_item.value
              )
            WHEN jsonb_typeof(tutor_profile.custom_fields -> rules.tutor_field) = 'array'
              THEN tutor_profile.custom_fields -> rules.tutor_field ? (animals.custom_fields ->> rules.animal_field)
            WHEN jsonb_typeof(animals.custom_fields -> rules.animal_field) = 'array'
              THEN EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(animals.custom_fields -> rules.animal_field) AS animal_item(value)
                WHERE tutor_profile.custom_fields ->> rules.tutor_field ILIKE '%' || animal_item.value || '%'
              )
            ELSE tutor_profile.custom_fields ->> rules.tutor_field ILIKE '%' || (animals.custom_fields ->> rules.animal_field) || '%'
          END
        WHEN rules.comparison_operator = '>='
          THEN matching_value_rank(tutor_profile.custom_fields ->> rules.tutor_field) >= matching_value_rank(animals.custom_fields ->> rules.animal_field)
        WHEN rules.comparison_operator = '<='
          THEN matching_value_rank(tutor_profile.custom_fields ->> rules.tutor_field) <= matching_value_rank(animals.custom_fields ->> rules.animal_field)
        ELSE false
      END AS matched
    FROM tutor_profile
    JOIN animals ON true
    CROSS JOIN matching_rules rules
    WHERE rules.is_active = true
  ),
  grouped AS (
    SELECT
      evaluated.tutor_id,
      evaluated.animal_id,
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
    GROUP BY evaluated.tutor_id, evaluated.animal_id
  )
  SELECT
    grouped.tutor_id,
    grouped.animal_id,
    grouped.compatibility_score,
    COALESCE(grouped.matched_rules, '[]'::jsonb),
    COALESCE(grouped.details, '[]'::jsonb)
  FROM grouped
  WHERE grouped.disqualified = false;
$$;

SELECT public.refresh_all_tutor_animal_matches();
