CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can read admin audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert admin audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can read admin audit logs" ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin audit logs" ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND auth_user_id = auth.uid());
