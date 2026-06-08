import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type CalendarSyncMessage = {
  msg_id: number;
  read_ct: number;
  message: {
    provider?: "google";
    calendar_event_id?: string | null;
    operation?: "upsert" | "delete";
    event_snapshot?: Record<string, unknown>;
  };
};

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
  provider: string | null;
  external_event_id: string | null;
  external_event_url: string | null;
  metadata: Record<string, unknown> | null;
};

type CalendarOAuthConnection = {
  id: string;
  provider: "google";
  calendar_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const googleClientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") ?? Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID") ?? "";
const googleClientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") ?? Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET") ?? "";
const syncSecret = Deno.env.get("CALENDAR_SYNC_SECRET") ?? "";
const batchSize = Number(Deno.env.get("CALENDAR_SYNC_BATCH_SIZE") ?? "20");
const maxMessageAttempts = Number(Deno.env.get("CALENDAR_SYNC_MAX_ATTEMPTS") ?? "5");
const visibilityTimeoutSeconds = Number(Deno.env.get("CALENDAR_SYNC_VISIBILITY_TIMEOUT_SECONDS") ?? "120");
const defaultTimeZone = Deno.env.get("CALENDAR_SYNC_TIME_ZONE") ?? "America/Sao_Paulo";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ message: "Use POST." }, 405);
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ message: "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios." }, 500);
  }

  if (syncSecret && !isAuthorized(req, syncSecret)) {
    return json({ message: "Nao autorizado." }, 401);
  }

  const connection = await loadGoogleConnection();
  if (!connection) {
    return json({ message: "Nenhuma conexao Google Calendar ativa foi encontrada." }, 400);
  }

  const accessToken = await ensureAccessToken(connection);
  const pushResult = await pushPendingJobs(connection, accessToken);
  const pullResult = await pullGoogleEvents(connection, accessToken);

  return json({
    pushed: pushResult,
    pulled: pullResult,
  });
});

function isAuthorized(req: Request, secret: string) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerSecret = req.headers.get("x-sync-secret");
  return bearer === secret || headerSecret === secret;
}

async function loadGoogleConnection() {
  const { data, error } = await supabase
    .from("calendar_oauth_connections")
    .select("id,provider,calendar_id,access_token,refresh_token,expires_at,metadata")
    .eq("provider", "google")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<CalendarOAuthConnection>();

  if (error) throw new Error(`Nao foi possivel carregar conexao Google: ${error.message}`);
  return data;
}

async function ensureAccessToken(connection: CalendarOAuthConnection) {
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const shouldRefresh = expiresAt > 0 && expiresAt <= Date.now() + 60_000;
  if (!shouldRefresh) return connection.access_token;
  if (!connection.refresh_token) return connection.access_token;
  if (!googleClientId || !googleClientSecret) return connection.access_token;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Falha ao renovar token Google: ${JSON.stringify(body)}`);

  const accessToken = String(body.access_token ?? connection.access_token);
  const expiresIn = Number(body.expires_in ?? 3600);
  await supabase
    .from("calendar_oauth_connections")
    .update({
      access_token: accessToken,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      metadata: {
        ...(connection.metadata ?? {}),
        token_refreshed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return accessToken;
}

async function pushPendingJobs(connection: CalendarOAuthConnection, accessToken: string) {
  const { data: messages, error } = await supabase.rpc("read_calendar_sync_messages", {
    batch_size: Math.max(1, Math.min(batchSize, 100)),
    visibility_timeout_seconds: Math.max(1, Math.min(visibilityTimeoutSeconds, 3600)),
  });
  if (error) throw new Error(`Nao foi possivel ler mensagens PGMQ do calendario: ${error.message}`);

  const claimedMessages = (messages ?? []) as CalendarSyncMessage[];
  let succeeded = 0;
  let failed = 0;
  let movedToFailedQueue = 0;

  for (const message of claimedMessages) {
    try {
      await processMessage(message, connection, accessToken);
      await archiveMessage(message.msg_id);
      succeeded += 1;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (message.read_ct >= maxMessageAttempts) {
        await sendFailedMessage(message, errorMessage);
        await archiveMessage(message.msg_id);
        movedToFailedQueue += 1;
      }
      failed += 1;
    }
  }

  return { claimed: claimedMessages.length, succeeded, failed, movedToFailedQueue };
}

async function processMessage(queueMessage: CalendarSyncMessage, connection: CalendarOAuthConnection, accessToken: string) {
  const message = queueMessage.message;
  if (message.provider && message.provider !== "google") return;

  if (message.operation === "delete") {
    const externalId = stringValue(message.event_snapshot?.external_event_id);
    if (externalId) await deleteGoogleEvent(connection.calendar_id, externalId, accessToken);
    return;
  }

  if (!message.calendar_event_id) return;

  const { data: event, error } = await supabase
    .from("calendar_events")
    .select("id,title,description,location,starts_at,ends_at,status,provider,external_event_id,external_event_url,metadata")
    .eq("id", message.calendar_event_id)
    .maybeSingle<CalendarEventRow>();

  if (error) throw new Error(`Nao foi possivel carregar evento local: ${error.message}`);
  if (!event) return;

  if (event.status === "cancelled") {
    if (event.external_event_id) await deleteGoogleEvent(connection.calendar_id, event.external_event_id, accessToken);
    await markEventSynced(event, { external_event_id: event.external_event_id, external_event_url: event.external_event_url });
    return;
  }

  const googleEvent = event.external_event_id
    ? await patchGoogleEvent(connection.calendar_id, event.external_event_id, accessToken, event)
    : await insertGoogleEvent(connection.calendar_id, accessToken, event);

  await markEventSynced(event, {
    external_event_id: stringValue(googleEvent.id),
    external_event_url: stringValue(googleEvent.htmlLink),
    google_updated: stringValue(googleEvent.updated),
  });
}

async function pullGoogleEvents(connection: CalendarOAuthConnection, accessToken: string) {
  const now = new Date();
  const updatedMin = stringValue(connection.metadata?.last_google_pull_at)
    || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("showDeleted", "true");
  url.searchParams.set("maxResults", "250");
  url.searchParams.set("updatedMin", updatedMin);

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Falha ao listar eventos do Google: ${JSON.stringify(body)}`);

  const items = Array.isArray(body.items) ? body.items : [];
  let upserted = 0;
  let cancelled = 0;

  for (const item of items) {
    if (!item.id) continue;

    if (item.status === "cancelled") {
      const { error } = await supabase
        .from("calendar_events")
        .update({
          status: "cancelled",
          metadata: buildSyncMetadata({}, item),
          updated_at: new Date().toISOString(),
        })
        .eq("provider", "google")
        .eq("external_event_id", String(item.id));
      if (error) throw new Error(`Nao foi possivel cancelar evento local: ${error.message}`);
      cancelled += 1;
      continue;
    }

    await saveGoogleEventToDatabase(item);
    upserted += 1;
  }

  await supabase
    .from("calendar_oauth_connections")
    .update({
      metadata: {
        ...(connection.metadata ?? {}),
        last_google_pull_at: now.toISOString(),
        last_google_pull_count: items.length,
      },
      updated_at: now.toISOString(),
    })
    .eq("id", connection.id);

  return { scanned: items.length, upserted, cancelled, updatedMin };
}

async function insertGoogleEvent(calendarId: string, accessToken: string, event: CalendarEventRow) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(toGoogleEvent(event)),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Falha ao criar evento no Google: ${JSON.stringify(body)}`);
  return body;
}

async function patchGoogleEvent(calendarId: string, eventId: string, accessToken: string, event: CalendarEventRow) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(toGoogleEvent(event)),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Falha ao atualizar evento no Google: ${JSON.stringify(body)}`);
  return body;
}

async function deleteGoogleEvent(calendarId: string, eventId: string, accessToken: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const body = await response.text();
    throw new Error(`Falha ao remover evento no Google: ${body}`);
  }
}

async function markEventSynced(event: CalendarEventRow, google: Record<string, unknown>) {
  const { error } = await supabase
    .from("calendar_events")
    .update({
      provider: "google",
      external_event_id: google.external_event_id ?? event.external_event_id,
      external_event_url: google.external_event_url ?? event.external_event_url,
      metadata: buildSyncMetadata(event.metadata ?? {}, google),
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id);

  if (error) throw new Error(`Nao foi possivel marcar evento como sincronizado: ${error.message}`);
}

async function archiveMessage(messageId: number) {
  const { error } = await supabase.rpc("archive_calendar_sync_message", {
    message_id: messageId,
  });
  if (error) throw new Error(`Nao foi possivel arquivar mensagem PGMQ ${messageId}: ${error.message}`);
}

async function sendFailedMessage(message: CalendarSyncMessage, errorMessage: string) {
  const { error } = await supabase.rpc("send_failed_calendar_sync_message", {
    message: {
      ...message.message,
      failed_at: new Date().toISOString(),
      read_ct: message.read_ct,
      error: errorMessage,
    },
  });
  if (error) throw new Error(`Nao foi possivel enviar mensagem para fila de falhas: ${error.message}`);
}

function toGoogleEvent(event: CalendarEventRow) {
  return {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: {
      dateTime: event.starts_at,
      timeZone: defaultTimeZone,
    },
    end: {
      dateTime: event.ends_at,
      timeZone: defaultTimeZone,
    },
  };
}

function googleEventToCalendarRow(item: Record<string, unknown>) {
  const start = item.start as Record<string, unknown> | undefined;
  const end = item.end as Record<string, unknown> | undefined;
  const startsAt = stringValue(start?.dateTime) || stringValue(start?.date);
  const endsAt = stringValue(end?.dateTime) || stringValue(end?.date);

  return {
    title: stringValue(item.summary) || "Evento Google Calendar",
    description: stringValue(item.description) || null,
    location: stringValue(item.location) || null,
    starts_at: startsAt,
    ends_at: endsAt,
    status: item.status === "cancelled" ? "cancelled" : "scheduled",
    provider: "google",
    external_event_id: stringValue(item.id),
    external_event_url: stringValue(item.htmlLink) || null,
    metadata: buildSyncMetadata({}, item),
    updated_at: new Date().toISOString(),
  };
}

async function saveGoogleEventToDatabase(item: Record<string, unknown>) {
  const externalEventId = stringValue(item.id);
  const row = googleEventToCalendarRow(item);
  if (!row.starts_at || !row.ends_at || !externalEventId) return;

  const { data: existing, error: selectError } = await supabase
    .from("calendar_events")
    .select("id,metadata")
    .eq("provider", "google")
    .eq("external_event_id", externalEventId)
    .maybeSingle<{ id: string; metadata: Record<string, unknown> | null }>();

  if (selectError) throw new Error(`Nao foi possivel localizar evento local: ${selectError.message}`);

  if (existing?.id) {
    const { error } = await supabase
      .from("calendar_events")
      .update({
        ...row,
        metadata: buildSyncMetadata(existing.metadata ?? {}, item),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Nao foi possivel atualizar evento local: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from("calendar_events")
    .insert(row);
  if (error) throw new Error(`Nao foi possivel inserir evento local: ${error.message}`);
}

function buildSyncMetadata(existing: Record<string, unknown>, googlePayload: Record<string, unknown>) {
  return {
    ...existing,
    calendar_sync: {
      source: "google_edge_function",
      synced_at: new Date().toISOString(),
      google_updated: stringValue(googlePayload.google_updated) || stringValue(googlePayload.updated),
    },
    google: googlePayload,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
