-- Bound short, structured text columns while keeping free-form content as TEXT.
-- PostgreSQL stores TEXT and VARCHAR similarly, so these limits are mainly data-quality
-- constraints for IDs, labels, statuses, URLs and contact fields.

ALTER TABLE IF EXISTS custom_fields
  DROP CONSTRAINT IF EXISTS custom_fields_source_question_id_fkey;

DROP POLICY IF EXISTS "Tutors can read their own scheduled interest events" ON calendar_events;

ALTER TABLE IF EXISTS tutors
  ALTER COLUMN name TYPE VARCHAR(120);

ALTER TABLE IF EXISTS admin_users
  ALTER COLUMN email TYPE VARCHAR(254);

ALTER TABLE IF EXISTS animals
  ALTER COLUMN name TYPE VARCHAR(120),
  ALTER COLUMN species TYPE VARCHAR(64);

ALTER TABLE IF EXISTS animal_photos
  ALTER COLUMN bucket_id TYPE VARCHAR(63),
  ALTER COLUMN storage_path TYPE VARCHAR(1024),
  ALTER COLUMN public_url TYPE VARCHAR(2048),
  ALTER COLUMN content_type TYPE VARCHAR(32);

ALTER TABLE IF EXISTS calendar_events
  ALTER COLUMN title TYPE VARCHAR(160),
  ALTER COLUMN location TYPE VARCHAR(255),
  ALTER COLUMN status TYPE VARCHAR(24),
  ALTER COLUMN provider TYPE VARCHAR(32),
  ALTER COLUMN external_event_id TYPE VARCHAR(255),
  ALTER COLUMN external_event_url TYPE VARCHAR(2048);

ALTER TABLE IF EXISTS ong_settings
  ALTER COLUMN id TYPE VARCHAR(32),
  ALTER COLUMN ong_name TYPE VARCHAR(160),
  ALTER COLUMN contact_email TYPE VARCHAR(254),
  ALTER COLUMN contact_phone TYPE VARCHAR(32),
  ALTER COLUMN whatsapp_phone TYPE VARCHAR(32),
  ALTER COLUMN website_url TYPE VARCHAR(2048),
  ALTER COLUMN address_line TYPE VARCHAR(255),
  ALTER COLUMN city TYPE VARCHAR(120),
  ALTER COLUMN state TYPE VARCHAR(64),
  ALTER COLUMN postal_code TYPE VARCHAR(20);

ALTER TABLE IF EXISTS onboarding_questions
  ALTER COLUMN id TYPE VARCHAR(64),
  ALTER COLUMN label TYPE VARCHAR(180),
  ALTER COLUMN placeholder TYPE VARCHAR(255),
  ALTER COLUMN type TYPE VARCHAR(32);

ALTER TABLE IF EXISTS custom_fields
  ALTER COLUMN entity_type TYPE VARCHAR(16),
  ALTER COLUMN field_key TYPE VARCHAR(64),
  ALTER COLUMN label TYPE VARCHAR(120),
  ALTER COLUMN field_type TYPE VARCHAR(32),
  ALTER COLUMN source_question_id TYPE VARCHAR(64);

ALTER TABLE IF EXISTS custom_fields
  ADD CONSTRAINT custom_fields_source_question_id_fkey
  FOREIGN KEY (source_question_id) REFERENCES onboarding_questions(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS matching_rules
  ALTER COLUMN rule_name TYPE VARCHAR(120),
  ALTER COLUMN tutor_field TYPE VARCHAR(64),
  ALTER COLUMN animal_field TYPE VARCHAR(64),
  ALTER COLUMN comparison_operator TYPE VARCHAR(16);

ALTER TABLE IF EXISTS service_configs
  ALTER COLUMN id TYPE VARCHAR(80),
  ALTER COLUMN service_type TYPE VARCHAR(32),
  ALTER COLUMN provider TYPE VARCHAR(32);

ALTER TABLE IF EXISTS calendar_oauth_connections
  ALTER COLUMN provider TYPE VARCHAR(32),
  ALTER COLUMN calendar_id TYPE VARCHAR(255),
  ALTER COLUMN account_email TYPE VARCHAR(254),
  ALTER COLUMN tenant_id TYPE VARCHAR(128),
  ALTER COLUMN token_type TYPE VARCHAR(32);

ALTER TABLE IF EXISTS public.admin_audit_logs
  ALTER COLUMN action TYPE VARCHAR(32),
  ALTER COLUMN resource TYPE VARCHAR(80),
  ALTER COLUMN resource_id TYPE VARCHAR(128);

CREATE POLICY "Tutors can read their own scheduled interest events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    status = 'scheduled'
    AND EXISTS (
      SELECT 1
      FROM tutor_interessados
      JOIN tutors ON tutors.id = tutor_interessados.tutor_id
      WHERE tutor_interessados.uuid_registro = calendar_events.interest_id
        AND tutors.auth_user_id = auth.uid()
    )
  );
