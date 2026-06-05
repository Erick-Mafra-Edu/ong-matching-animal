CREATE TABLE IF NOT EXISTS tutor_interessados (
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  data_registro TIMESTAMPTZ DEFAULT NOW(),
  uuid_registro UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

CREATE INDEX IF NOT EXISTS tutor_interessados_tutor_id_idx
  ON tutor_interessados (tutor_id);

CREATE INDEX IF NOT EXISTS tutor_interessados_animal_id_idx
  ON tutor_interessados (animal_id);

ALTER TABLE tutor_interessados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can read their own interest records" ON tutor_interessados;
DROP POLICY IF EXISTS "Admins can read interest records" ON tutor_interessados;
CREATE POLICY "Admins can read interest records"
  ON tutor_interessados FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Tutors can create their own interest records" ON tutor_interessados;
CREATE POLICY "Tutors can create their own interest records"
  ON tutor_interessados FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tutors
      WHERE tutors.id = tutor_interessados.tutor_id
        AND tutors.auth_user_id = auth.uid()
    )
  );
