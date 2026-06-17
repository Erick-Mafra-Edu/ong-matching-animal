-- DANGER: destructive cleanup for ONG Matching Animal application objects.
-- Use only when you intentionally want to rebuild the app schema from migrations.
-- It removes app tables, app functions/triggers, storage policies and cron jobs.
-- It does not drop Supabase schemas, auth.users, storage.objects, storage.buckets or extensions.
-- Supabase blocks direct deletion from storage.objects; delete bucket files with the
-- Storage API or dashboard before removing the bucket if a full file cleanup is needed.

BEGIN;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    SELECT cron.job.jobid
    INTO existing_job_id
    FROM cron.job
    WHERE cron.job.jobname = 'refresh-tutor-animal-matches'
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;
  END IF;
EXCEPTION
  WHEN invalid_schema_name OR undefined_table OR undefined_function THEN
    NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.calendar_events') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS calendar_events_enqueue_sync ON public.calendar_events;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anyone can read animal photo objects" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can upload animal photo objects" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can update animal photo objects" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can delete animal photo objects" ON storage.objects;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.enqueue_calendar_sync_message();
DROP FUNCTION IF EXISTS public.read_calendar_sync_messages(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.archive_calendar_sync_message(BIGINT);
DROP FUNCTION IF EXISTS public.send_failed_calendar_sync_message(JSONB);
DROP FUNCTION IF EXISTS public.calculate_match_score(UUID, INT, NUMERIC);
DROP FUNCTION IF EXISTS public.match_animals_for_tutor(UUID, INT);
DROP FUNCTION IF EXISTS public.match_animals_for_tutor(UUID, INT, NUMERIC);
DROP FUNCTION IF EXISTS public.count_match_candidates_for_tutor(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.refresh_all_tutor_animal_matches();
DROP FUNCTION IF EXISTS public.refresh_tutor_animal_matches(UUID);
DROP FUNCTION IF EXISTS public.compute_tutor_animal_matches(UUID);
DROP FUNCTION IF EXISTS public.matching_value_rank(TEXT);

DO $$
BEGIN
  IF to_regnamespace('pgmq') IS NOT NULL THEN
    PERFORM pgmq.drop_queue('calendar_sync');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
  IF to_regnamespace('pgmq') IS NOT NULL THEN
    PERFORM pgmq.drop_queue('calendar_sync_failed');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.tutor_animal_matches CASCADE;
DROP TABLE IF EXISTS public.calendar_oauth_connections CASCADE;
DROP TABLE IF EXISTS public.service_configs CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.tutor_interessados CASCADE;
DROP TABLE IF EXISTS public.animal_photos CASCADE;
DROP TABLE IF EXISTS public.matching_rules CASCADE;
DROP TABLE IF EXISTS public.custom_fields CASCADE;
DROP TABLE IF EXISTS public.onboarding_questions CASCADE;
DROP TABLE IF EXISTS public.ong_settings CASCADE;
DROP TABLE IF EXISTS public.animals CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.tutors CASCADE;

DROP FUNCTION IF EXISTS public.is_admin(UUID);

COMMIT;
