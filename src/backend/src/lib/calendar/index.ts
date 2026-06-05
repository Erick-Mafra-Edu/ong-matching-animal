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

export async function createCalendarAdapterFromDB(supabaseUrl: string, serviceRoleKey: string): Promise<CalendarAdapter | null> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/service_configs?service_type=eq.calendar&is_active=eq.true&limit=1`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) return null;
    const body = await response.json();
    const configRecord = Array.isArray(body) ? body[0] : null;

    if (!configRecord || !configRecord.config) return null;

    const { provider, config } = configRecord;

    if (provider === "google") {
      return new GoogleCalendarAdapter({
        calendarId: config.calendarId,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
      });
    }

    if (provider === "microsoft") {
      return new MicrosoftCalendarAdapter({
        calendarId: config.calendarId,
        userId: config.userId,
        accessToken: config.accessToken,
      });
    }

    return null;
  } catch (error) {
    console.error("Erro ao carregar configuracao do calendario do banco:", error);
    return null;
  }
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
