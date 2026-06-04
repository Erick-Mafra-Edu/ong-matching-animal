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
