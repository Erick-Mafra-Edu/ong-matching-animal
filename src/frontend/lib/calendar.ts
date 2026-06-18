import { backendApiUrl } from "@/lib/backend";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type CalendarEventStatus = "scheduled" | "completed" | "cancelled";
export type CalendarEventProvider = "google" | "microsoft";

export interface CalendarEventRecord {
  id: string;
  tutor_id?: string | null;
  animal_id?: string | null;
  interest_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  status: CalendarEventStatus;
  provider?: CalendarEventProvider | null;
  external_event_id?: string | null;
  external_event_url?: string | null;
  metadata?: Record<string, unknown>;
  tutor_name?: string;
  animal_name?: string;
  animal_species?: string;
}

export interface CalendarEventInput {
  tutor_id?: string | null;
  animal_id?: string | null;
  interest_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  status: CalendarEventStatus;
  provider?: CalendarEventProvider | null;
  external_event_id?: string | null;
  external_event_url?: string | null;
  metadata?: Record<string, unknown>;
}

async function getAccessToken() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) throw error ?? new Error("Sessão ausente.");
  return data.session.access_token;
}

async function calendarFetch<T>(path: string, init: RequestInit = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(backendApiUrl(path), {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body ? String(body.message) : "Falha ao acessar o calendário.";
    throw new Error(message);
  }

  return body as T;
}

export function listCalendarEvents(params: { from?: string; to?: string } = {}) {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return calendarFetch<CalendarEventRecord[]>(`/api/calendar-events${suffix}`);
}

export function createCalendarEvent(payload: CalendarEventInput) {
  return calendarFetch<CalendarEventRecord>("/api/calendar-events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCalendarEvent(id: string, payload: CalendarEventInput) {
  return calendarFetch<CalendarEventRecord>(`/api/calendar-events/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCalendarEvent(id: string) {
  return calendarFetch<{ deleted: boolean }>(`/api/calendar-events/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
