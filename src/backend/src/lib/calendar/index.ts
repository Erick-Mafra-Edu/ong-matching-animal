import { GoogleCalendarAdapter, type GoogleCalendarAdapterOptions } from "./googleCalendarAdapter";
import { MicrosoftCalendarAdapter, type MicrosoftCalendarAdapterOptions } from "./microsoftCalendarAdapter";
import type { CalendarAdapter, CalendarProvider } from "./types";

export type {
  CalendarAdapter,
  CalendarAttendee,
  CalendarDateTime,
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventUpdate,
  CalendarListOptions,
  CalendarProvider,
} from "./types";
export { GoogleCalendarAdapter } from "./googleCalendarAdapter";
export { MicrosoftCalendarAdapter } from "./microsoftCalendarAdapter";

export type CalendarAdapterConfig =
  | ({ provider: "google" } & GoogleCalendarAdapterOptions)
  | ({ provider: "microsoft" } & MicrosoftCalendarAdapterOptions);

export function createCalendarAdapter(config: CalendarAdapterConfig): CalendarAdapter {
  if (config.provider === "google") return new GoogleCalendarAdapter(config);
  return new MicrosoftCalendarAdapter(config);
}

export async function createCalendarAdapterFromDB(supabaseUrl: string, serviceRoleKey: string): Promise<CalendarAdapter | null> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/calendar_oauth_connections?is_active=eq.true&order=updated_at.desc&limit=1`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) return null;
    const body = await response.json();
    const connection = Array.isArray(body) ? body[0] : null;
    if (!connection?.provider || !connection.access_token) return null;

    const provider = connection.provider as CalendarProvider;
    const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
    const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : false;
    const accessToken = isExpired
      ? await refreshAccessToken(supabaseUrl, serviceRoleKey, connection)
      : String(connection.access_token);

    if (provider === "google") {
      return new GoogleCalendarAdapter({
        calendarId: connection.calendar_id,
        accessToken,
        refreshToken: connection.refresh_token ?? undefined,
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CALENDAR_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? process.env.GOOGLE_CALENDAR_REDIRECT_URI,
      });
    }

    if (provider === "microsoft") {
      return new MicrosoftCalendarAdapter({
        calendarId: connection.calendar_id,
        userId: connection.account_email ?? undefined,
        accessToken,
      });
    }

    return null;
  } catch (error) {
    console.error("Erro ao carregar configuracao OAuth do calendario:", error);
    return null;
  }
}

async function refreshAccessToken(supabaseUrl: string, serviceRoleKey: string, connection: Record<string, unknown>) {
  const provider = String(connection.provider ?? "");
  const refreshToken = String(connection.refresh_token ?? "");
  if (!refreshToken) return String(connection.access_token ?? "");

  const tokenUrl = provider === "google"
    ? "https://oauth2.googleapis.com/token"
    : `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? "common"}/oauth2/v2.0/token`;

  const clientId = provider === "google"
    ? process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CALENDAR_CLIENT_ID
    : process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const clientSecret = provider === "google"
    ? process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    : process.env.MICROSOFT_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) return String(connection.access_token ?? "");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) return String(connection.access_token ?? "");

  const body = await response.json() as Record<string, unknown>;
  const newAccessToken = String(body.access_token ?? connection.access_token ?? "");
  const expiresIn = Number(body.expires_in ?? 3600);
  await fetch(`${supabaseUrl}/rest/v1/calendar_oauth_connections?id=eq.${encodeURIComponent(String(connection.id ?? ""))}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      access_token: newAccessToken,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });

  return newAccessToken;
}

export function createCalendarAdapterFromEnv(provider: CalendarProvider = readCalendarProvider()): CalendarAdapter {
  if (provider === "google") {
    return new GoogleCalendarAdapter({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      accessToken: process.env.GOOGLE_CALENDAR_ACCESS_TOKEN,
      refreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    });
  }

  return new MicrosoftCalendarAdapter({
    calendarId: process.env.MICROSOFT_CALENDAR_ID,
    userId: process.env.MICROSOFT_CALENDAR_USER_ID,
    accessToken: process.env.MICROSOFT_GRAPH_ACCESS_TOKEN,
  });
}

function readCalendarProvider(): CalendarProvider {
  const provider = process.env.CALENDAR_PROVIDER;
  if (provider === "google" || provider === "microsoft") return provider;
  throw new Error("Configure CALENDAR_PROVIDER como google ou microsoft.");
}
