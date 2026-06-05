-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tutors
CREATE TABLE tutors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  name TEXT NOT NULL,
  location geography(POINT),
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users backed by Supabase Auth
CREATE TABLE admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX admin_users_auth_user_id_idx
  ON admin_users (auth_user_id)
  WHERE is_active;

CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE auth_user_id = check_user_id
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Animals
CREATE TABLE animals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES tutors(id),
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  location geography(POINT),
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'animal-photos',
  'animal-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Animal photos stored in Supabase Storage
CREATE TABLE animal_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL DEFAULT 'animal-photos',
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  size_bytes INT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX animal_photos_animal_id_idx
  ON animal_photos (animal_id);

CREATE UNIQUE INDEX animal_photos_one_primary_per_animal_idx
  ON animal_photos (animal_id)
  WHERE is_primary;

-- Tutor interest records created when a logged tutor chooses to adopt an animal
CREATE TABLE tutor_interessados (
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  data_registro TIMESTAMPTZ DEFAULT NOW(),
  uuid_registro UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

CREATE INDEX tutor_interessados_tutor_id_idx
  ON tutor_interessados (tutor_id);

CREATE INDEX tutor_interessados_animal_id_idx
  ON tutor_interessados (animal_id);

-- Calendar events for adoption follow-ups and meetings
CREATE TABLE calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tutor_id UUID REFERENCES tutors(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  interest_id UUID REFERENCES tutor_interessados(uuid_registro) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  provider TEXT CHECK (provider IN ('google', 'microsoft')),
  external_event_id TEXT,
  external_event_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX calendar_events_starts_at_idx
  ON calendar_events (starts_at);

CREATE INDEX calendar_events_tutor_id_idx
  ON calendar_events (tutor_id);

CREATE INDEX calendar_events_animal_id_idx
  ON calendar_events (animal_id);

CREATE UNIQUE INDEX calendar_events_provider_external_idx
  ON calendar_events (provider, external_event_id)
  WHERE provider IS NOT NULL AND external_event_id IS NOT NULL;

-- Custom fields catalog used by admin forms and matching rules
CREATE TABLE custom_fields (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tutor', 'animal')),
  field_key TEXT NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'boolean', 'select', 'multiselect')),
  options JSONB,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, field_key)
);

CREATE INDEX custom_fields_entity_active_sort_idx
  ON custom_fields (entity_type, is_active, sort_order, label);

INSERT INTO custom_fields (entity_type, field_key, label, field_type, options, is_active, sort_order) VALUES
  ('tutor', 'pref_energia', 'Energia desejada', 'select', '["baixo","medio","alto"]'::jsonb, true, 10),
  ('tutor', 'tem_criancas', 'Tem crianças', 'boolean', NULL, true, 20),
  ('tutor', 'tamanho_casa', 'Tamanho da casa', 'select', '["apartamento","casa_quintal_pequeno","casa_quintal_grande","pequeno","medio","grande"]'::jsonb, true, 30),
  ('tutor', 'tem_quintal', 'Tem quintal', 'boolean', NULL, true, 40),
  ('tutor', 'renda_mensal', 'Renda mensal', 'select', '["ate_1000","1000_3000","3000_6000","6000_acima"]'::jsonb, true, 50),
  ('tutor', 'disponibilidade_tempo', 'Disponibilidade de tempo', 'select', '["meio_periodo","integral"]'::jsonb, true, 60),
  ('animal', 'nivel_energia', 'Nível de energia', 'select', '["baixo","medio","alto"]'::jsonb, true, 10),
  ('animal', 'aceita_criancas', 'Aceita crianças', 'boolean', NULL, true, 20),
  ('animal', 'espaco_necessario', 'Espaço necessário', 'select', '["apartamento","casa_quintal_pequeno","casa_quintal_grande"]'::jsonb, true, 30),
  ('animal', 'tamanho', 'Tamanho', 'select', '["pequeno","medio","grande"]'::jsonb, true, 40),
  ('animal', 'requer_espaco', 'Espaço necessário', 'select', '["apartamento","casa_pequena","casa_grande"]'::jsonb, true, 50),
  ('animal', 'vacinado', 'Vacinado', 'boolean', NULL, true, 60);

-- Matching rules
CREATE TABLE matching_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  tutor_field TEXT NOT NULL,
  animal_field TEXT NOT NULL,
  comparison_operator TEXT DEFAULT '=',
  weight INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dynamic onboarding questions configured by the ONG
CREATE TABLE onboarding_questions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,
  type TEXT NOT NULL CHECK (type IN ('text', 'select', 'radio', 'boolean', 'multiselect')),
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
  ('notes', 'Quer contar algo importante para a ONG?', NULL, 'Ex.: já tenho um gato adulto em casa', 'text', NULL, false, 60);

ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_interessados ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can read their own admin status"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can read active onboarding questions"
  ON onboarding_questions FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage onboarding questions"
  ON onboarding_questions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Tutors can read their own profile"
  ON tutors FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Tutors can create their own profile"
  ON tutors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Tutors can update their own profile"
  ON tutors FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can read animals"
  ON animals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create animals"
  ON animals FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update animals"
  ON animals FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete animals"
  ON animals FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Authenticated users can read animal photos"
  ON animal_photos FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM animals
      WHERE animals.id = animal_photos.animal_id
    )
  );

CREATE POLICY "Admins can create animal photos"
  ON animal_photos FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update animal photos"
  ON animal_photos FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete animal photos"
  ON animal_photos FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can read interest records"
  ON tutor_interessados FOR SELECT
  TO authenticated
  USING (is_admin());

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

CREATE POLICY "Admins can manage calendar events"
  ON calendar_events FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read active custom fields"
  ON custom_fields FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage custom fields"
  ON custom_fields FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read active matching rules"
  ON matching_rules FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage matching rules"
  ON matching_rules FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Anyone can read animal photo objects"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'animal-photos');

CREATE POLICY "Admins can upload animal photo objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'animal-photos'
    AND is_admin()
  );

CREATE POLICY "Admins can update animal photo objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'animal-photos'
    AND is_admin()
  )
  WITH CHECK (
    bucket_id = 'animal-photos'
    AND is_admin()
  );

CREATE POLICY "Admins can delete animal photo objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'animal-photos'
    AND is_admin()
  );
