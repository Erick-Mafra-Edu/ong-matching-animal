WITH ranked_interests AS (
  SELECT
    uuid_registro,
    tutor_id,
    animal_id,
    FIRST_VALUE(uuid_registro) OVER (
      PARTITION BY tutor_id, animal_id
      ORDER BY data_registro ASC NULLS LAST, uuid_registro ASC
    ) AS keep_uuid,
    ROW_NUMBER() OVER (
      PARTITION BY tutor_id, animal_id
      ORDER BY data_registro ASC NULLS LAST, uuid_registro ASC
    ) AS duplicate_rank
  FROM public.tutor_interessados
),
duplicate_interests AS (
  SELECT uuid_registro, keep_uuid
  FROM ranked_interests
  WHERE duplicate_rank > 1
)
UPDATE public.calendar_events
SET interest_id = duplicate_interests.keep_uuid
FROM duplicate_interests
WHERE public.calendar_events.interest_id = duplicate_interests.uuid_registro
  AND public.calendar_events.interest_id <> duplicate_interests.keep_uuid;

WITH ranked_interests AS (
  SELECT
    uuid_registro,
    tutor_id,
    animal_id,
    ROW_NUMBER() OVER (
      PARTITION BY tutor_id, animal_id
      ORDER BY data_registro ASC NULLS LAST, uuid_registro ASC
    ) AS duplicate_rank
  FROM public.tutor_interessados
)
DELETE FROM public.tutor_interessados
USING ranked_interests
WHERE public.tutor_interessados.uuid_registro = ranked_interests.uuid_registro
  AND ranked_interests.duplicate_rank > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tutor_interessados_tutor_animal_key'
      AND conrelid = 'public.tutor_interessados'::regclass
  ) THEN
    ALTER TABLE public.tutor_interessados
      ADD CONSTRAINT tutor_interessados_tutor_animal_key UNIQUE (tutor_id, animal_id);
  END IF;
END $$;
