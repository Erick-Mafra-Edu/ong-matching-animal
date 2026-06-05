import { GoogleCalendarAdapter } from "../googleCalendarAdapter";
import { MicrosoftCalendarAdapter } from "../microsoftCalendarAdapter";
import { createCalendarAdapter } from "../index";
import type { CalendarEventDraft } from "../types";

const eventDraft: CalendarEventDraft = {
  title: "Visita de adocao",
  description: "Conversa com tutor interessado.",
  location: "ONG",
  start: { dateTime: "2026-06-10T14:00:00", timeZone: "America/Sao_Paulo" },
  end: { dateTime: "2026-06-10T15:00:00", timeZone: "America/Sao_Paulo" },
  attendees: [{ email: "tutor@example.com", name: "Tutor" }],
};

describe("calendar adapters", () => {
  it("maps a common event draft to Google Calendar", async () => {
    const insert = jest.fn().mockResolvedValue({
      data: {
        id: "google-event-id",
        summary: eventDraft.title,
        description: eventDraft.description,
        location: eventDraft.location,
        htmlLink: "https://calendar.google.com/event",
        start: eventDraft.start,
        end: eventDraft.end,
        attendees: [{ email: "tutor@example.com", displayName: "Tutor" }],
      },
    });
    const calendarClient = {
      events: {
        insert,
      },
    };

    const adapter = new GoogleCalendarAdapter({
      calendarId: "primary",
      calendarClient: calendarClient as any,
    });

    const event = await adapter.createEvent(eventDraft);

    expect(insert).toHaveBeenCalledWith({
      calendarId: "primary",
      requestBody: {
        summary: eventDraft.title,
        description: eventDraft.description,
        location: eventDraft.location,
        start: eventDraft.start,
        end: eventDraft.end,
        attendees: [{ email: "tutor@example.com", displayName: "Tutor", optional: undefined }],
      },
      sendUpdates: "all",
    });
    expect(event).toMatchObject({
      id: "google-event-id",
      provider: "google",
      title: eventDraft.title,
      attendees: [{ email: "tutor@example.com", name: "Tutor" }],
    });
  });

  it("maps a common event draft to Microsoft Graph", async () => {
    const post = jest.fn().mockResolvedValue({
      id: "microsoft-event-id",
      subject: eventDraft.title,
      body: { content: eventDraft.description },
      location: { displayName: eventDraft.location },
      webLink: "https://outlook.office.com/calendar/item",
      start: eventDraft.start,
      end: eventDraft.end,
      attendees: [{ type: "required", emailAddress: { address: "tutor@example.com", name: "Tutor" } }],
    });
    const api = jest.fn().mockReturnValue({ post });

    const adapter = new MicrosoftCalendarAdapter({
      graphClient: { api } as any,
    });

    const event = await adapter.createEvent(eventDraft);

    expect(api).toHaveBeenCalledWith("/me/events");
    expect(post).toHaveBeenCalledWith({
      subject: eventDraft.title,
      body: {
        contentType: "HTML",
        content: eventDraft.description,
      },
      location: { displayName: eventDraft.location },
      start: eventDraft.start,
      end: eventDraft.end,
      attendees: [{
        type: "required",
        emailAddress: { address: "tutor@example.com", name: "Tutor" },
      }],
    });
    expect(event).toMatchObject({
      id: "microsoft-event-id",
      provider: "microsoft",
      title: eventDraft.title,
      attendees: [{ email: "tutor@example.com", name: "Tutor" }],
    });
  });

  it("creates adapters from the common factory", () => {
    expect(createCalendarAdapter({ provider: "google", calendarClient: { events: {} } as any })).toBeInstanceOf(GoogleCalendarAdapter);
    expect(createCalendarAdapter({ provider: "microsoft", graphClient: { api: jest.fn() } as any })).toBeInstanceOf(MicrosoftCalendarAdapter);
  });
});
