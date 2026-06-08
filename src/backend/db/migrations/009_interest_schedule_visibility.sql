ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS interest_id UUID REFERENCES tutor_interessados(uuid_registro) ON DELETE SET NULL;

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS external_event_url TEXT;

CREATE INDEX IF NOT EXISTS calendar_events_interest_id_idx
  ON calendar_events (interest_id);

DROP POLICY IF EXISTS "Tutors can read their own interest records" ON tutor_interessados;
CREATE POLICY "Tutors can read their own interest records"
  ON tutor_interessados FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tutors
      WHERE tutors.id = tutor_interessados.tutor_id
        AND tutors.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tutors can read their own scheduled interest events" ON calendar_events;
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
