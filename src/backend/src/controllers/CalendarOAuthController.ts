import crypto from "crypto";
import { Request, Response } from "express";
import { getSupabaseBackendConfig, readJsonResponse, requireAdmin } from "./apiSupport";

type Provider = "google" | "microsoft";

export class CalendarOAuthController {
  start = async (req: Request, res: Response) => {
    const provider = parseProvider(req.params.provider);
    if (!provider) {
      res.status(400).json({ message: "Provider invalido." });
      return;
    }

    const context = await requireAdmin(req, res);
    if (!context) return;

    const config = getProviderConfig(provider);
    if (!config.clientId || !config.redirectUri) {
      res.status(500).json({ message: "Variaveis OAuth nao configuradas." });
      return;
    }

    const state = createState(provider, context.admin.id, context.serviceRoleKey);
    const url = new URL(config.authUrl);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("scope", config.scope);
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "consent");
    if (provider === "google") url.searchParams.set("access_type", "offline");

    res.json({ authorizationUrl: url.toString(), state });
  };

  callback = async (req: Request, res: Response) => {
    const provider = parseProvider(req.params.provider);
    if (!provider) {
      res.status(400).send("Provider invalido.");
      return;
    }

    const { code, state } = req.query as Record<string, string | undefined>;
    const backendConfig = getSupabaseBackendConfig();
    if (!backendConfig.supabaseUrl || !backendConfig.serviceRoleKey) {
      res.status(500).send("Variaveis do Supabase nao configuradas.");
      return;
    }

    const oauthState = state ? parseState(state, provider, backendConfig.serviceRoleKey) : null;
    if (!code || !oauthState) {
      res.status(400).send("State ou code OAuth invalido.");
      return;
    }

    const admin = await loadAdminById(backendConfig.supabaseUrl, backendConfig.serviceRoleKey, oauthState.adminId);
    if (!admin) {
      res.status(403).send("Acesso administrativo necessario.");
      return;
    }

    const config = getProviderConfig(provider);
    if (!config.clientId || !config.clientSecret || !config.redirectUri) {
      res.status(500).send("Variaveis OAuth nao configuradas.");
      return;
    }

    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
      }),
    });
    const tokenBody = await readJsonResponse(tokenResponse) as Record<string, unknown> | null;
    if (!tokenResponse.ok) {
      res.status(tokenResponse.status).send(`Falha ao concluir OAuth: ${JSON.stringify(tokenBody)}`);
      return;
    }

    const saveResult = await saveConnection(backendConfig.supabaseUrl, backendConfig.serviceRoleKey, provider, tokenBody ?? {}, admin.id);
    if (!saveResult.ok) {
      if (saveResult.missingTable) {
        res.status(500).send("Tabela calendar_oauth_connections ausente. Aplique a migration src/backend/db/migrations/013_calendar_oauth_connections.sql no Supabase e tente conectar novamente.");
        return;
      }

      res.status(500).send(`Nao foi possivel salvar a conexao OAuth: ${JSON.stringify(saveResult.details)}`);
      return;
    }

    res.redirect("/admin?calendar_oauth=connected");
  };

  refresh = async (req: Request, res: Response) => {
    const provider = parseProvider(req.params.provider);
    if (!provider) {
      res.status(400).json({ message: "Provider invalido." });
      return;
    }

    const context = await requireAdmin(req, res);
    if (!context) return;

    const connectionResult = await loadConnection(context.supabaseUrl, context.serviceRoleKey, provider);
    if (!connectionResult.ok) {
      res.status(500).json({
        message: connectionResult.missingTable
          ? "Tabela calendar_oauth_connections ausente. Aplique a migration 013_calendar_oauth_connections.sql."
          : "Nao foi possivel carregar a conexao OAuth.",
        details: connectionResult.details,
      });
      return;
    }

    const connection = connectionResult.connection;
    if (!connection?.refresh_token) {
      res.status(400).json({ message: "Conexao sem refresh token." });
      return;
    }

    const config = getProviderConfig(provider);
    if (!config.clientId || !config.clientSecret) {
      res.status(500).json({ message: "Variaveis OAuth nao configuradas." });
      return;
    }

    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: String(connection.refresh_token),
      }),
    });
    const tokenBody = await readJsonResponse(tokenResponse) as Record<string, unknown> | null;
    if (!tokenResponse.ok) {
      res.status(tokenResponse.status).json({ message: "Falha ao renovar token.", details: tokenBody });
      return;
    }

    const saveResult = await saveConnection(context.supabaseUrl, context.serviceRoleKey, provider, tokenBody ?? {}, context.admin.id, String(connection.id));
    if (!saveResult.ok) {
      res.status(500).json({
        message: saveResult.missingTable
          ? "Tabela calendar_oauth_connections ausente. Aplique a migration 013_calendar_oauth_connections.sql."
          : "Nao foi possivel salvar a conexao OAuth.",
        details: saveResult.details,
      });
      return;
    }

    res.json({ refreshed: true });
  };

  disconnect = async (req: Request, res: Response) => {
    const provider = parseProvider(req.params.provider);
    if (!provider) {
      res.status(400).json({ message: "Provider invalido." });
      return;
    }

    const context = await requireAdmin(req, res);
    if (!context) return;

    const response = await fetch(`${context.supabaseUrl}/rest/v1/calendar_oauth_connections?provider=eq.${provider}&is_active=eq.true`, {
      method: "PATCH",
      headers: {
        apikey: context.serviceRoleKey,
        authorization: `Bearer ${context.serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify({ is_active: false, updated_by: context.admin.id, updated_at: new Date().toISOString() }),
    });
    const body = await readJsonResponse(response);
    if (!response.ok) {
      res.status(response.status).json({
        message: isMissingCalendarOAuthTable(body)
          ? "Tabela calendar_oauth_connections ausente. Aplique a migration 013_calendar_oauth_connections.sql."
          : "Nao foi possivel desconectar o calendario.",
        details: body,
      });
      return;
    }

    res.json({ disconnected: true });
  };

  status = async (req: Request, res: Response) => {
    const provider = parseProvider(req.params.provider);
    if (!provider) {
      res.status(400).json({ message: "Provider invalido." });
      return;
    }

    const context = await requireAdmin(req, res);
    if (!context) return;

    const connectionResult = await loadConnection(context.supabaseUrl, context.serviceRoleKey, provider);
    if (!connectionResult.ok) {
      res.status(500).json({
        message: connectionResult.missingTable
          ? "Tabela calendar_oauth_connections ausente. Aplique a migration 013_calendar_oauth_connections.sql."
          : "Nao foi possivel carregar a conexao OAuth.",
        details: connectionResult.details,
      });
      return;
    }

    res.json({ connected: Boolean(connectionResult.connection), connection: connectionResult.connection });
  };
}

function parseProvider(value: string | undefined): Provider | null {
  if (value === "google" || value === "microsoft") return value;
  return null;
}

function createState(provider: Provider, adminId: string, secret: string) {
  const payload = Buffer.from(JSON.stringify({ provider, adminId, nonce: crypto.randomUUID(), at: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function parseState(state: string, provider: Provider, secret: string) {
  try {
    const [payload, signature] = state.split(".");
    if (!payload) return null;

    if (signature) {
      const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      provider?: string;
      adminId?: string;
      at?: number;
    };
    const issuedAt = Number(parsed.at ?? 0);
    const isFresh = issuedAt > 0 && Date.now() - issuedAt <= 10 * 60 * 1000;
    if (parsed.provider !== provider || !parsed.adminId || !isFresh) return null;
    return { adminId: parsed.adminId };
  } catch {
    return null;
  }
}

function getProviderConfig(provider: Provider) {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? process.env.GOOGLE_CALENDAR_REDIRECT_URI,
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email",
    };
  }

  const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
  return {
    clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_OAUTH_REDIRECT_URI,
    authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    scope: "offline_access Calendars.ReadWrite User.Read",
  };
}

async function loadConnection(supabaseUrl: string, serviceRoleKey: string, provider: Provider) {
  const response = await fetch(`${supabaseUrl}/rest/v1/calendar_oauth_connections?provider=eq.${provider}&is_active=eq.true&order=updated_at.desc&limit=1`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!response.ok) {
    const body = await readJsonResponse(response);
    return { ok: false as const, missingTable: isMissingCalendarOAuthTable(body), details: body };
  }
  const body = await response.json() as Array<Record<string, unknown>>;
  return { ok: true as const, connection: body[0] ?? null };
}

async function loadAdminById(supabaseUrl: string, serviceRoleKey: string, adminId: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/admin_users?select=id,auth_user_id,email,is_active&id=eq.${encodeURIComponent(adminId)}&is_active=eq.true&limit=1`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!response.ok) return null;
  const body = await response.json() as Array<{ id: string; auth_user_id: string; email: string; is_active: boolean }>;
  return body[0] ?? null;
}

async function saveConnection(supabaseUrl: string, serviceRoleKey: string, provider: Provider, tokenBody: Record<string, unknown>, adminId: string, existingId?: string) {
  const payload = {
    provider,
    calendar_id: String(tokenBody.calendar_id ?? tokenBody.calendarId ?? "primary"),
    account_email: String(tokenBody.account_email ?? tokenBody.accountEmail ?? ""),
    tenant_id: String(tokenBody.tenant_id ?? tokenBody.tenantId ?? ""),
    access_token: String(tokenBody.access_token ?? tokenBody.accessToken ?? ""),
    refresh_token: tokenBody.refresh_token ? String(tokenBody.refresh_token) : undefined,
    token_type: String(tokenBody.token_type ?? tokenBody.tokenType ?? "Bearer"),
    scope: String(tokenBody.scope ?? ""),
    expires_at: tokenBody.expires_in ? new Date(Date.now() + Number(tokenBody.expires_in) * 1000).toISOString() : undefined,
    metadata: tokenBody,
    is_active: true,
    created_by: adminId,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/calendar_oauth_connections${existingId ? `?id=eq.${encodeURIComponent(existingId)}` : ""}`, {
    method: existingId ? "PATCH" : "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await readJsonResponse(response);
    return { ok: false as const, missingTable: isMissingCalendarOAuthTable(body), details: body };
  }

  return { ok: true as const };
}

function isMissingCalendarOAuthTable(body: unknown) {
  if (!body || typeof body !== "object") return false;
  const record = body as { code?: unknown; message?: unknown };
  return record.code === "PGRST205" || String(record.message ?? "").includes("calendar_oauth_connections");
}
