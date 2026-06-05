export type CalendarProvider = "google" | "microsoft";

export interface CalendarDateTime {
  dateTime: string;
  timeZone: string;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  optional?: boolean;
}

export interface CalendarEventDraft {
  title: string;
  description?: string;
  location?: string;
  start: CalendarDateTime;
  end: CalendarDateTime;
  attendees?: CalendarAttendee[];
}

export interface CalendarEventUpdate extends Partial<CalendarEventDraft> {
  id: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: CalendarDateTime;
  end: CalendarDateTime;
  attendees: CalendarAttendee[];
  provider: CalendarProvider;
  raw?: unknown;
}

export interface CalendarListOptions {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}

export interface CalendarAdapter {
  createEvent(event: CalendarEventDraft): Promise<CalendarEvent>;
  updateEvent(event: CalendarEventUpdate): Promise<CalendarEvent>;
  deleteEvent(eventId: string): Promise<void>;
  listEvents(options?: CalendarListOptions): Promise<CalendarEvent[]>;
}
