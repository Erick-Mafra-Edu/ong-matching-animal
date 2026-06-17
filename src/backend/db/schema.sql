-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Tutors
CREATE TABLE tutors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  name TEXT NOT NULL,
  location geography(POINT),
  custom_fields JSONB DEFAULT '{}'::jsonb,
  onboarding_completed_at TIMESTAMPTZ,
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

CREATE INDEX idx_animals_owner_id
  ON animals (owner_id);

CREATE INDEX idx_animals_location_gist
  ON animals USING gist (location);

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

-- Public/contact settings for the ONG profile used by adoption flows
CREATE TABLE ong_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  ong_name TEXT NOT NULL DEFAULT 'ONG Matching Animal',
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_phone TEXT,
  website_url TEXT,
  address_line TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  business_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  adoption_message_template TEXT DEFAULT 'Estou com interesse de adotar {nomeDoAnimal}. O link do interesse e {linkInteresse}.' || E'\n\n' || 'Observacoes:',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (social_links IS NOT NULL AND jsonb_typeof(social_links) = 'object'),
  CHECK (business_hours IS NOT NULL AND jsonb_typeof(business_hours) = 'object'),
  CHECK (settings IS NOT NULL AND jsonb_typeof(settings) = 'object')
);

INSERT INTO ong_settings (id, ong_name, is_active)
VALUES ('default', 'ONG Matching Animal', true)
ON CONFLICT (id) DO NOTHING;

-- Custom fields catalog used by admin forms and matching rules
CREATE TABLE custom_fields (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tutor', 'animal')),
  field_key TEXT NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'boolean', 'select', 'multiselect')),
  options JSONB,
  source_question_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, field_key)
);

CREATE INDEX custom_fields_entity_active_sort_idx
  ON custom_fields (entity_type, is_active, sort_order, label);

INSERT INTO custom_fields (entity_type, field_key, label, field_type, options, source_question_id, is_active, sort_order) VALUES
  ('tutor', 'pref_energia', 'Energia desejada', 'select', '["baixo","medio","alto"]'::jsonb, 'preferred_energy', true, 10),
  ('tutor', 'tem_criancas', 'Tem crianças', 'boolean', NULL, 'has_children', true, 20),
  ('tutor', 'tamanho_casa', 'Tamanho da casa', 'select', '["apartamento","casa_quintal_pequeno","casa_quintal_grande","pequeno","medio","grande"]'::jsonb, 'home_type', true, 30),
  ('tutor', 'tem_quintal', 'Tem quintal', 'boolean', NULL, NULL, true, 40),
  ('tutor', 'renda_mensal', 'Renda mensal', 'select', '["ate_1000","1000_3000","3000_6000","6000_acima"]'::jsonb, NULL, true, 50),
  ('tutor', 'disponibilidade_tempo', 'Disponibilidade de tempo', 'select', '["meio_periodo","integral"]'::jsonb, 'routine', true, 60),
  ('animal', 'nivel_energia', 'Nível de energia', 'select', '["baixo","medio","alto"]'::jsonb, NULL, true, 10),
  ('animal', 'aceita_criancas', 'Aceita crianças', 'boolean', NULL, NULL, true, 20),
  ('animal', 'espaco_necessario', 'Espaço necessário', 'select', '["apartamento","casa_quintal_pequeno","casa_quintal_grande"]'::jsonb, NULL, true, 30),
  ('animal', 'tamanho', 'Tamanho', 'select', '["pequeno","medio","grande"]'::jsonb, NULL, true, 40),
  ('animal', 'requer_espaco', 'Espaço necessário', 'select', '["apartamento","casa_pequena","casa_grande"]'::jsonb, NULL, true, 50),
  ('animal', 'vacinado', 'Vacinado', 'boolean', NULL, NULL, true, 60);

-- Matching rules
CREATE TABLE matching_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  tutor_field TEXT NOT NULL,
  animal_field TEXT NOT NULL,
  comparison_operator TEXT DEFAULT '=',
  weight INT DEFAULT 10,
  is_dealbreaker BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tutor_animal_matches (
  tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  compatibility_score INT NOT NULL,
  matched_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tutor_id, animal_id)
);

CREATE INDEX idx_tutor_matches_score
  ON tutor_animal_matches (tutor_id, compatibility_score DESC);

CREATE OR REPLACE FUNCTION matching_value_rank(raw_value TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw_value IS NULL THEN 0
    WHEN raw_value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN raw_value::NUMERIC
    WHEN raw_value IN ('baixo', 'apartamento') THEN 1
    WHEN raw_value IN ('medio', 'casa_sem_quintal', 'casa_quintal_pequeno', 'casa_pequena') THEN 2
    WHEN raw_value IN ('alto', 'casa_com_quintal', 'casa_quintal_grande', 'casa_grande') THEN 3
    ELSE 0
  END;
$$;

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

CREATE OR REPLACE FUNCTION count_match_candidates_for_tutor(
  target_tutor_id UUID,
  max_distance_km NUMERIC DEFAULT 50
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tutor_location geography(POINT);
  total_candidates INT;
BEGIN
  SELECT location INTO tutor_location
  FROM tutors
  WHERE id = target_tutor_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INT INTO total_candidates
  FROM animals
  WHERE max_distance_km IS NULL
    OR tutor_location IS NULL
    OR animals.location IS NULL
    OR ST_DWithin(animals.location, tutor_location, max_distance_km * 1000);

  RETURN total_candidates;
END;
$$;

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX onboarding_questions_active_updated_at_idx
  ON onboarding_questions (is_active, updated_at DESC);

INSERT INTO onboarding_questions (id, label, description, placeholder, type, options, required, sort_order) VALUES
  ('home_type', 'Como é a sua moradia?', 'Isso ajuda a recomendar animais compatíveis com o espaço disponível.', NULL, 'radio', '[{"label":"Apartamento","value":"apartamento"},{"label":"Casa sem quintal","value":"casa_sem_quintal"},{"label":"Casa com quintal","value":"casa_com_quintal"}]'::jsonb, true, 10),
  ('routine', 'Quanto tempo você costuma passar em casa?', NULL, 'Selecione sua rotina', 'select', '[{"label":"Poucas horas por dia","value":"poucas_horas"},{"label":"Meio período","value":"meio_periodo"},{"label":"A maior parte do dia","value":"maior_parte_dia"}]'::jsonb, true, 20),
  ('has_children', 'Há crianças na residência?', NULL, NULL, 'boolean', NULL, true, 30),
  ('preferred_energy', 'Qual nível de energia combina com sua rotina?', NULL, NULL, 'radio', '[{"label":"Tranquilo","value":"baixo"},{"label":"Equilibrado","value":"medio"},{"label":"Ativo","value":"alto"}]'::jsonb, true, 40),
  ('preferences', 'O que você procura em um novo companheiro?', 'Escolha uma ou mais opções.', NULL, 'multiselect', '[{"label":"Companhia","value":"companhia"},{"label":"Passeios","value":"passeios"},{"label":"Convívio com outros animais","value":"outros_animais"},{"label":"Perfil independente","value":"independente"}]'::jsonb, true, 50),
  ('notes', 'Quer contar algo importante para a ONG?', NULL, 'Ex.: já tenho um gato adulto em casa', 'text', NULL, false, 60);

ALTER TABLE custom_fields
  ADD CONSTRAINT custom_fields_source_question_id_fkey
  FOREIGN KEY (source_question_id) REFERENCES onboarding_questions(id) ON DELETE SET NULL;

ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_interessados ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ong_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_animal_matches ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Anyone can read active ONG settings"
  ON ong_settings FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage ONG settings"
  ON ong_settings FOR ALL
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

CREATE POLICY "Admins can manage cached matches"
  ON tutor_animal_matches FOR ALL
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
