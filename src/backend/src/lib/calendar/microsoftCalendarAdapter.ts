import { Client } from "@microsoft/microsoft-graph-client";
import type {
  CalendarAdapter,
  CalendarAttendee,
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventUpdate,
  CalendarListOptions,
} from "./types";

type GraphClient = Pick<Client, "api">;

interface GraphRequest {
  get(): Promise<unknown>;
  post(body: unknown): Promise<unknown>;
  patch(body: unknown): Promise<unknown>;
  delete(): Promise<unknown>;
  query(query: Record<string, string | number>): GraphRequest;
  top(count: number): GraphRequest;
}

interface MicrosoftGraphEvent {
  id?: string;
  subject?: string;
  body?: {
    content?: string;
    contentType?: string;
  };
  location?: {
    displayName?: string;
  };
  webLink?: string;
  start?: {
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    type?: string;
    emailAddress?: {
      address?: string;
      name?: string;
    };
  }>;
}

interface MicrosoftGraphListResponse {
  value?: MicrosoftGraphEvent[];
}

export interface MicrosoftCalendarAdapterOptions {
  accessToken?: string;
  calendarId?: string;
  userId?: string;
  graphClient?: GraphClient;
}

export class MicrosoftCalendarAdapter implements CalendarAdapter {
  private readonly client: GraphClient;
  private readonly eventsPath: string;

  constructor(options: MicrosoftCalendarAdapterOptions) {
    this.client = options.graphClient ?? buildMicrosoftGraphClient(options.accessToken);
    this.eventsPath = buildEventsPath(options);
  }

  async createEvent(event: CalendarEventDraft): Promise<CalendarEvent> {
    const response = await this.client.api(this.eventsPath).post(toMicrosoftEvent(event));
    return fromMicrosoftEvent(response as MicrosoftGraphEvent);
  }

  async updateEvent(event: CalendarEventUpdate): Promise<CalendarEvent> {
    const response = await this.client.api(`${this.eventsPath}/${encodeURIComponent(event.id)}`).patch(toMicrosoftEvent(event));
    return fromMicrosoftEvent(response as MicrosoftGraphEvent);
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.client.api(`${this.eventsPath}/${encodeURIComponent(eventId)}`).delete();
  }

  async listEvents(options: CalendarListOptions = {}): Promise<CalendarEvent[]> {
    const query: Record<string, string | number> = {
      "$orderby": "start/dateTime",
    };

    if (options.timeMin) query.startDateTime = options.timeMin;
    if (options.timeMax) query.endDateTime = options.timeMax;

    const request = this.client.api(`${this.eventsPath}/calendarView`).query(query).top(options.maxResults ?? 50) as GraphRequest;
    const response = await request.get() as MicrosoftGraphListResponse;

    return (response.value ?? []).map(fromMicrosoftEvent);
  }
}

function buildMicrosoftGraphClient(accessToken?: string) {
  if (!accessToken) {
    throw new Error("Informe accessToken ou graphClient para usar o Microsoft Calendar adapter.");
  }

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

function buildEventsPath(options: MicrosoftCalendarAdapterOptions) {
  const ownerPath = options.userId ? `/users/${encodeURIComponent(options.userId)}` : "/me";
  if (options.calendarId) return `${ownerPath}/calendars/${encodeURIComponent(options.calendarId)}/events`;
  return `${ownerPath}/events`;
}

function toMicrosoftEvent(event: Partial<CalendarEventDraft>) {
  return {
    subject: event.title,
    body: event.description ? {
      contentType: "HTML",
      content: event.description,
    } : undefined,
    location: event.location ? {
      displayName: event.location,
    } : undefined,
    start: event.start ? {
      dateTime: event.start.dateTime,
      timeZone: event.start.timeZone,
    } : undefined,
    end: event.end ? {
      dateTime: event.end.dateTime,
      timeZone: event.end.timeZone,
    } : undefined,
    attendees: event.attendees?.map((attendee) => ({
      type: attendee.optional ? "optional" : "required",
      emailAddress: {
        address: attendee.email,
        name: attendee.name ?? attendee.email,
      },
    })),
  };
}

function fromMicrosoftEvent(event: MicrosoftGraphEvent): CalendarEvent {
  return {
    id: requireValue(event.id, "Microsoft Graph nao retornou o id do evento."),
    title: event.subject ?? "",
    description: event.body?.content ?? undefined,
    location: event.location?.displayName ?? undefined,
    htmlLink: event.webLink ?? undefined,
    start: {
      dateTime: event.start?.dateTime ?? "",
      timeZone: event.start?.timeZone ?? "UTC",
    },
    end: {
      dateTime: event.end?.dateTime ?? "",
      timeZone: event.end?.timeZone ?? "UTC",
    },
    attendees: (event.attendees ?? []).map((attendee): CalendarAttendee => ({
      email: attendee.emailAddress?.address ?? "",
      name: attendee.emailAddress?.name ?? undefined,
      optional: attendee.type === "optional" ? true : undefined,
    })).filter((attendee) => attendee.email),
    provider: "microsoft",
    raw: event,
  };
}

function requireValue(value: string | undefined, message: string) {
  if (!value) throw new Error(message);
  return value;
}
