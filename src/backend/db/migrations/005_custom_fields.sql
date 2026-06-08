CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tutor', 'animal')),
  field_key TEXT NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'boolean', 'select', 'multiselect')),
  options JSONB,
  source_question_id TEXT REFERENCES onboarding_questions(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, field_key)
);

CREATE INDEX IF NOT EXISTS custom_fields_entity_active_sort_idx
  ON custom_fields (entity_type, is_active, sort_order, label);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read active custom fields" ON custom_fields;
CREATE POLICY "Authenticated users can read active custom fields"
  ON custom_fields FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage custom fields" ON custom_fields;
CREATE POLICY "Admins can manage custom fields"
  ON custom_fields FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

INSERT INTO custom_fields (entity_type, field_key, label, field_type, options, source_question_id, is_active, sort_order)
VALUES
  ('tutor', 'pref_energia', 'Energia desejada', 'select', '["baixo","medio","alto"]'::jsonb, 'preferred_energy', true, 10),
  ('tutor', 'tem_criancas', 'Tem criancas', 'boolean', NULL, 'has_children', true, 20),
  ('tutor', 'tamanho_casa', 'Tamanho da casa', 'select', '["apartamento","casa_quintal_pequeno","casa_quintal_grande","pequeno","medio","grande"]'::jsonb, 'home_type', true, 30),
  ('tutor', 'tem_quintal', 'Tem quintal', 'boolean', NULL, NULL, true, 40),
  ('tutor', 'renda_mensal', 'Renda mensal', 'select', '["ate_1000","1000_3000","3000_6000","6000_acima"]'::jsonb, NULL, true, 50),
  ('tutor', 'disponibilidade_tempo', 'Disponibilidade de tempo', 'select', '["meio_periodo","integral"]'::jsonb, 'routine', true, 60),
  ('animal', 'nivel_energia', 'Nivel de energia', 'select', '["baixo","medio","alto"]'::jsonb, NULL, true, 10),
  ('animal', 'aceita_criancas', 'Aceita criancas', 'boolean', NULL, NULL, true, 20),
  ('animal', 'espaco_necessario', 'Espaco necessario', 'select', '["apartamento","casa_quintal_pequeno","casa_quintal_grande"]'::jsonb, NULL, true, 30),
  ('animal', 'tamanho', 'Tamanho', 'select', '["pequeno","medio","grande"]'::jsonb, NULL, true, 40),
  ('animal', 'requer_espaco', 'Espaco necessario', 'select', '["apartamento","casa_pequena","casa_grande"]'::jsonb, NULL, true, 50),
  ('animal', 'vacinado', 'Vacinado', 'boolean', NULL, NULL, true, 60)
ON CONFLICT (entity_type, field_key) DO UPDATE SET
  label = EXCLUDED.label,
  field_type = EXCLUDED.field_type,
  options = EXCLUDED.options,
  source_question_id = EXCLUDED.source_question_id,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
