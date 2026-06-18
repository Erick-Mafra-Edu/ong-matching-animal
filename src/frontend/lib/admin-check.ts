import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function isAdmin() {
  const { data, error } = await getSupabaseBrowserClient().auth.getUser();
  if (error || !data.user) return false;

  const { data: adminData } = await getSupabaseBrowserClient()
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .eq("is_active", true)
    .single();

  return !!adminData;
}
