-- Promote the first Supabase Auth user to system administrator.
-- Replace both values below before running.

INSERT INTO public.admin_users (
  auth_user_id,
  email,
  is_active,
  created_by
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',
  true,
  '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (auth_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  is_active = true,
  updated_at = NOW();
