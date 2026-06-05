CREATE TABLE IF NOT EXISTS calendar_events (
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

CREATE INDEX IF NOT EXISTS calendar_events_starts_at_idx
  ON calendar_events (starts_at);

CREATE INDEX IF NOT EXISTS calendar_events_tutor_id_idx
  ON calendar_events (tutor_id);

CREATE INDEX IF NOT EXISTS calendar_events_animal_id_idx
  ON calendar_events (animal_id);

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_provider_external_idx
  ON calendar_events (provider, external_event_id)
  WHERE provider IS NOT NULL AND external_event_id IS NOT NULL;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage calendar events" ON calendar_events;
CREATE POLICY "Admins can manage calendar events"
  ON calendar_events FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
