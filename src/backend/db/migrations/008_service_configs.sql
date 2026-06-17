-- Configuration for external services
CREATE TABLE service_configs (
  id VARCHAR(80) PRIMARY KEY,
  service_type VARCHAR(32) NOT NULL CHECK (service_type IN ('calendar')),
  provider VARCHAR(32) NOT NULL CHECK (provider IN ('google', 'microsoft')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy for admins to manage service configs
ALTER TABLE service_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service configs"
  ON service_configs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
