-- Public/contact settings for the ONG profile used by adoption flows.
CREATE TABLE IF NOT EXISTS ong_settings (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  ong_name VARCHAR(160) NOT NULL DEFAULT 'ONG Matching Animal',
  contact_email VARCHAR(254),
  contact_phone VARCHAR(32),
  whatsapp_phone VARCHAR(32),
  website_url VARCHAR(2048),
  address_line VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(64),
  postal_code VARCHAR(20),
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

ALTER TABLE ong_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active ONG settings" ON ong_settings;
CREATE POLICY "Anyone can read active ONG settings"
  ON ong_settings FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage ONG settings" ON ong_settings;
CREATE POLICY "Admins can manage ONG settings"
  ON ong_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
