CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS tutor_animal_matches (
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  compatibility_score INT NOT NULL,
  matched_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tutor_id, animal_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_matches_score
  ON tutor_animal_matches (tutor_id, compatibility_score DESC);

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
      CASE rules.comparison_operator
        WHEN '=' THEN tutor_profile.custom_fields -> rules.tutor_field = animals.custom_fields -> rules.animal_field
        WHEN '!=' THEN tutor_profile.custom_fields -> rules.tutor_field <> animals.custom_fields -> rules.animal_field
        WHEN 'contains' THEN
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
        WHEN '>=' THEN matching_value_rank(tutor_profile.custom_fields ->> rules.tutor_field) >= matching_value_rank(animals.custom_fields ->> rules.animal_field)
        WHEN '<=' THEN matching_value_rank(tutor_profile.custom_fields ->> rules.tutor_field) <= matching_value_rank(animals.custom_fields ->> rules.animal_field)
        ELSE false
      END AS matched
    FROM tutor_profile
    JOIN animals ON true
    CROSS JOIN matching_rules rules
    WHERE rules.is_active = true
      AND tutor_profile.custom_fields ? rules.tutor_field
      AND animals.custom_fields ? rules.animal_field
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
  WHERE grouped.disqualified = false
    AND grouped.compatibility_score > 0;
$$;

CREATE OR REPLACE FUNCTION refresh_tutor_animal_matches(target_tutor_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  refreshed_rows INT := 0;
BEGIN
  DELETE FROM tutor_animal_matches
  WHERE tutor_id = target_tutor_id;

  INSERT INTO tutor_animal_matches (
    tutor_id,
    animal_id,
    compatibility_score,
    matched_rules,
    details,
    updated_at
  )
  SELECT
    computed.tutor_id,
    computed.animal_id,
    computed.compatibility_score,
    computed.matched_rules,
    computed.details,
    NOW()
  FROM compute_tutor_animal_matches(target_tutor_id) AS computed;

  GET DIAGNOSTICS refreshed_rows = ROW_COUNT;
  RETURN refreshed_rows;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_all_tutor_animal_matches()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tutor_record RECORD;
  refreshed_total INT := 0;
BEGIN
  FOR tutor_record IN
    SELECT tutors.id
    FROM tutors
  LOOP
    refreshed_total := refreshed_total + refresh_tutor_animal_matches(tutor_record.id);
  END LOOP;

  RETURN refreshed_total;
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
  WITH tutor_profile AS (
    SELECT tutors.id, tutors.location
    FROM tutors
    WHERE tutors.id = target_tutor_id
  )
  SELECT
    cache.animal_id,
    animals.name AS animal_name,
    cache.compatibility_score,
    cache.matched_rules,
    cache.details
  FROM tutor_animal_matches AS cache
  JOIN tutor_profile
    ON tutor_profile.id = cache.tutor_id
  JOIN animals
    ON animals.id = cache.animal_id
  WHERE cache.tutor_id = target_tutor_id
    AND (
      max_distance_km IS NULL
      OR tutor_profile.location IS NULL
      OR animals.location IS NULL
      OR ST_DWithin(animals.location, tutor_profile.location, max_distance_km * 1000)
    )
  ORDER BY cache.compatibility_score DESC, animals.name ASC
  LIMIT result_limit;
$$;

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
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM match_animals_for_tutor(target_tutor_id, result_limit, max_distance_km);
$$;

ALTER TABLE tutor_animal_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can read their own cached matches" ON tutor_animal_matches;
CREATE POLICY "Tutors can read their own cached matches"
  ON tutor_animal_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tutors
      WHERE tutors.id = tutor_animal_matches.tutor_id
        AND tutors.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage cached matches" ON tutor_animal_matches;
CREATE POLICY "Admins can manage cached matches"
  ON tutor_animal_matches FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

SELECT refresh_all_tutor_animal_matches();

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT cron.job.jobid
  INTO existing_job_id
  FROM cron.job
  WHERE cron.job.jobname = 'refresh-tutor-animal-matches'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'refresh-tutor-animal-matches',
    '*/15 * * * *',
    $cron$SELECT refresh_all_tutor_animal_matches();$cron$
  );
END;
$$;
