CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(254) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_users_auth_user_id_idx
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

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can read their own admin status" ON admin_users;
CREATE POLICY "Admin users can read their own admin status"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Admins can read admin users" ON admin_users;

DROP POLICY IF EXISTS "Admins can create admin users" ON admin_users;

DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;

DROP POLICY IF EXISTS "Admins can delete admin users" ON admin_users;

DROP POLICY IF EXISTS "Authenticated users can read active onboarding questions" ON onboarding_questions;
CREATE POLICY "Authenticated users can read active onboarding questions"
  ON onboarding_questions FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage onboarding questions" ON onboarding_questions;
CREATE POLICY "Admins can manage onboarding questions"
  ON onboarding_questions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Tutors can read their own profile" ON tutors;
CREATE POLICY "Tutors can read their own profile"
  ON tutors FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id OR is_admin());

DROP POLICY IF EXISTS "Tutors can create their own profile" ON tutors;
CREATE POLICY "Tutors can create their own profile"
  ON tutors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id OR is_admin());

DROP POLICY IF EXISTS "Tutors can update their own profile" ON tutors;
CREATE POLICY "Tutors can update their own profile"
  ON tutors FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id OR is_admin())
  WITH CHECK (auth.uid() = auth_user_id OR is_admin());

DROP POLICY IF EXISTS "Admins can delete tutors" ON tutors;
CREATE POLICY "Admins can delete tutors"
  ON tutors FOR DELETE
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Authenticated users can read animals" ON animals;
CREATE POLICY "Authenticated users can read animals"
  ON animals FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Tutors can create their own animals" ON animals;
DROP POLICY IF EXISTS "Admins can create animals" ON animals;
CREATE POLICY "Admins can create animals"
  ON animals FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Tutors can update their own animals" ON animals;
DROP POLICY IF EXISTS "Admins can update animals" ON animals;
CREATE POLICY "Admins can update animals"
  ON animals FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Tutors can delete their own animals" ON animals;
DROP POLICY IF EXISTS "Admins can delete animals" ON animals;
CREATE POLICY "Admins can delete animals"
  ON animals FOR DELETE
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Authenticated users can read animal photos" ON animal_photos;
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

DROP POLICY IF EXISTS "Animal owners can create photos" ON animal_photos;
DROP POLICY IF EXISTS "Admins can create animal photos" ON animal_photos;
CREATE POLICY "Admins can create animal photos"
  ON animal_photos FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Animal owners can update photos" ON animal_photos;
DROP POLICY IF EXISTS "Admins can update animal photos" ON animal_photos;
CREATE POLICY "Admins can update animal photos"
  ON animal_photos FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Animal owners can delete photos" ON animal_photos;
DROP POLICY IF EXISTS "Admins can delete animal photos" ON animal_photos;
CREATE POLICY "Admins can delete animal photos"
  ON animal_photos FOR DELETE
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Authenticated users can read active matching rules" ON matching_rules;
CREATE POLICY "Authenticated users can read active matching rules"
  ON matching_rules FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin());

DROP POLICY IF EXISTS "Admins can manage matching rules" ON matching_rules;
CREATE POLICY "Admins can manage matching rules"
  ON matching_rules FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Anyone can read animal photo objects" ON storage.objects;
CREATE POLICY "Anyone can read animal photo objects"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'animal-photos');

DROP POLICY IF EXISTS "Animal owners can upload animal photo objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload animal photo objects" ON storage.objects;
CREATE POLICY "Admins can upload animal photo objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'animal-photos'
    AND is_admin()
  );

DROP POLICY IF EXISTS "Animal owners can update animal photo objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update animal photo objects" ON storage.objects;
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

DROP POLICY IF EXISTS "Animal owners can delete animal photo objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete animal photo objects" ON storage.objects;
CREATE POLICY "Admins can delete animal photo objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'animal-photos'
    AND is_admin()
  );
