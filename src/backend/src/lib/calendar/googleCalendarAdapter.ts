import { google, calendar_v3 } from "googleapis";
import type {
  CalendarAdapter,
  CalendarAttendee,
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventUpdate,
  CalendarListOptions,
} from "./types";

export interface GoogleCalendarAdapterOptions {
  calendarId?: string;
  auth?: unknown;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  sendUpdates?: "all" | "externalOnly" | "none";
  calendarClient?: calendar_v3.Calendar;
}

const defaultCalendarId = "primary";

export class GoogleCalendarAdapter implements CalendarAdapter {
  private readonly calendarId: string;
  private readonly client: calendar_v3.Calendar;
  private readonly sendUpdates: "all" | "externalOnly" | "none";

  constructor(options: GoogleCalendarAdapterOptions) {
    this.calendarId = options.calendarId ?? defaultCalendarId;
    this.sendUpdates = options.sendUpdates ?? "all";
    this.client = options.calendarClient ?? google.calendar({
      version: "v3",
      auth: (options.auth ?? buildGoogleAuth(options)) as any,
    });
  }

  async createEvent(event: CalendarEventDraft): Promise<CalendarEvent> {
    const response = await this.client.events.insert({
      calendarId: this.calendarId,
      requestBody: toGoogleEvent(event),
      sendUpdates: this.sendUpdates,
    });

    return fromGoogleEvent(response.data);
  }

  async updateEvent(event: CalendarEventUpdate): Promise<CalendarEvent> {
    const response = await this.client.events.patch({
      calendarId: this.calendarId,
      eventId: event.id,
      requestBody: toGoogleEvent(event),
      sendUpdates: this.sendUpdates,
    });

    return fromGoogleEvent(response.data);
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.client.events.delete({
      calendarId: this.calendarId,
      eventId,
      sendUpdates: this.sendUpdates,
    });
  }

  async listEvents(options: CalendarListOptions = {}): Promise<CalendarEvent[]> {
    const response = await this.client.events.list({
      calendarId: this.calendarId,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      maxResults: options.maxResults ?? 50,
    });

    return (response.data.items ?? []).map(fromGoogleEvent);
  }
}

function buildGoogleAuth(options: GoogleCalendarAdapterOptions) {
  const auth = new google.auth.OAuth2(options.clientId, options.clientSecret, options.redirectUri);

  auth.setCredentials({
    access_token: options.accessToken,
    refresh_token: options.refreshToken,
  });

  return auth;
}

function toGoogleEvent(event: Partial<CalendarEventDraft>): calendar_v3.Schema$Event {
  return {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: event.start ? { dateTime: event.start.dateTime, timeZone: event.start.timeZone } : undefined,
    end: event.end ? { dateTime: event.end.dateTime, timeZone: event.end.timeZone } : undefined,
    attendees: event.attendees?.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.name,
      optional: attendee.optional,
    })),
  };
}

function fromGoogleEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: requireValue(event.id, "Google Calendar nao retornou o id do evento."),
    title: event.summary ?? "",
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    htmlLink: event.htmlLink ?? undefined,
    start: {
      dateTime: event.start?.dateTime ?? event.start?.date ?? "",
      timeZone: event.start?.timeZone ?? "UTC",
    },
    end: {
      dateTime: event.end?.dateTime ?? event.end?.date ?? "",
      timeZone: event.end?.timeZone ?? "UTC",
    },
    attendees: (event.attendees ?? []).map((attendee): CalendarAttendee => ({
      email: attendee.email ?? "",
      name: attendee.displayName ?? undefined,
      optional: attendee.optional ?? undefined,
    })).filter((attendee) => attendee.email),
    provider: "google",
    raw: event,
  };
}

function requireValue(value: string | null | undefined, message: string) {
  if (!value) throw new Error(message);
  return value;
}
