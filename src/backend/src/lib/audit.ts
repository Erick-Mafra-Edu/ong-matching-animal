import { getSupabaseBackendConfig } from "../controllers/apiSupport";

interface AdminAuditLogPayload {
  auth_user_id: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: Record<string, unknown>;
}

function getAuditConfig() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase URL or Service Role Key not configured.");
  }

  return { supabaseUrl, serviceRoleKey };
}

export async function logAdminAction(payload: AdminAuditLogPayload) {
  try {
    const { supabaseUrl, serviceRoleKey } = getAuditConfig();
    const response = await fetch(`${supabaseUrl}/rest/v1/admin_audit_logs`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (response && !response.ok) {
      console.error("Error logging admin action:", await response.text());
    }
  } catch (error) {
    console.error("Failed to create Supabase client or log action:", error);
  }
}
