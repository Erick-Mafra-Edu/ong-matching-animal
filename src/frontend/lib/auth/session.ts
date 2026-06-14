export const authCookieNames = {
  accessToken: "matchpet-access-token",
  refreshToken: "matchpet-refresh-token",
} as const;

interface SyncAuthSessionInput {
  accessToken: string;
  refreshToken: string;
}

export async function syncAuthSessionCookies(input: SyncAuthSessionInput) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel sincronizar a sessao de autenticacao.");
  }
}
