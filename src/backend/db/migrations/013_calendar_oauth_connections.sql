CREATE TABLE IF NOT EXISTS calendar_oauth_connections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider VARCHAR(32) NOT NULL CHECK (provider IN ('google', 'microsoft')),
  calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
  account_email VARCHAR(254),
  tenant_id VARCHAR(128),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(32) DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendar_oauth_connections_provider_active_idx
  ON calendar_oauth_connections (provider, is_active, updated_at DESC);

ALTER TABLE calendar_oauth_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read calendar oauth connections" ON calendar_oauth_connections;
CREATE POLICY "Admins can read calendar oauth connections"
  ON calendar_oauth_connections FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage calendar oauth connections" ON calendar_oauth_connections;
CREATE POLICY "Admins can manage calendar oauth connections"
  ON calendar_oauth_connections FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
