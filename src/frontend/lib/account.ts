import { backendApiUrl } from "@/lib/backend";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AccountProfile {
  id: string | null;
  auth_user_id: string;
  email: string | null;
  name: string;
  onboarding_completed_at: string | null;
  questionnaire_updated_at: string | null;
  onboarding_outdated: boolean;
}

export class AccountSessionError extends Error {
  constructor() {
    super("Sessao ausente.");
    this.name = "AccountSessionError";
  }
}

async function getAccessToken() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) {
    throw error ?? new AccountSessionError();
  }
  return data.session.access_token;
}

export async function fetchAccountProfile() {
  const token = await getAccessToken();
  const response = await fetch(backendApiUrl("/api/tutors/me"), {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel carregar o perfil.");
  }

  return response.json() as Promise<AccountProfile>;
}

export async function updateAccountName(name: string) {
  const token = await getAccessToken();
  const response = await fetch(backendApiUrl("/api/tutors/me"), {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel atualizar o nome.");
  }
}

export async function changeAccountPassword(currentPassword: string, newPassword: string) {
  const token = await getAccessToken();
  const response = await fetch(backendApiUrl("/api/auth/change-password"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel alterar a senha.");
  }
}

export async function requestPasswordRecovery(email: string) {
  const response = await fetch(backendApiUrl("/api/auth/password-recovery"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Nao foi possivel solicitar recuperacao de senha.");
  }
}
