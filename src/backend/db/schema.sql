-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tutors
CREATE TABLE tutors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  location geography(POINT),
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
