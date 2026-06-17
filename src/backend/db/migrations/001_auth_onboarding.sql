DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tutors_auth_user_id_key'
  ) THEN
    ALTER TABLE tutors ADD CONSTRAINT tutors_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS onboarding_questions (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(180) NOT NULL,
  description TEXT,
  placeholder VARCHAR(255),
  type VARCHAR(32) NOT NULL CHECK (type IN ('text', 'select', 'radio', 'boolean', 'multiselect')),
  options JSONB,
  required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO onboarding_questions (id, label, description, placeholder, type, options, required, sort_order) VALUES
  ('home_type', 'Como é a sua moradia?', 'Isso ajuda a recomendar animais compatíveis com o espaço disponível.', NULL, 'radio', '[{"label":"Apartamento","value":"apartamento"},{"label":"Casa sem quintal","value":"casa_sem_quintal"},{"label":"Casa com quintal","value":"casa_com_quintal"}]'::jsonb, true, 10),
  ('routine', 'Quanto tempo você costuma passar em casa?', NULL, 'Selecione sua rotina', 'select', '[{"label":"Poucas horas por dia","value":"poucas_horas"},{"label":"Meio período","value":"meio_periodo"},{"label":"A maior parte do dia","value":"maior_parte_dia"}]'::jsonb, true, 20),
  ('has_children', 'Há crianças na residência?', NULL, NULL, 'boolean', NULL, true, 30),
  ('preferred_energy', 'Qual nível de energia combina com sua rotina?', NULL, NULL, 'radio', '[{"label":"Tranquilo","value":"baixo"},{"label":"Equilibrado","value":"medio"},{"label":"Ativo","value":"alto"}]'::jsonb, true, 40),
  ('preferences', 'O que você procura em um novo companheiro?', 'Escolha uma ou mais opções.', NULL, 'multiselect', '[{"label":"Companhia","value":"companhia"},{"label":"Passeios","value":"passeios"},{"label":"Convívio com outros animais","value":"outros_animais"},{"label":"Perfil independente","value":"independente"}]'::jsonb, true, 50),
  ('notes', 'Quer contar algo importante para a ONG?', NULL, 'Ex.: já tenho um gato adulto em casa', 'text', NULL, false, 60)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  placeholder = EXCLUDED.placeholder,
  type = EXCLUDED.type,
  options = EXCLUDED.options,
  required = EXCLUDED.required,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active onboarding questions" ON onboarding_questions;
CREATE POLICY "Authenticated users can read active onboarding questions"
  ON onboarding_questions FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Tutors can read their own profile" ON tutors;
CREATE POLICY "Tutors can read their own profile"
  ON tutors FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Tutors can create their own profile" ON tutors;
CREATE POLICY "Tutors can create their own profile"
  ON tutors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Tutors can update their own profile" ON tutors;
CREATE POLICY "Tutors can update their own profile"
  ON tutors FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
