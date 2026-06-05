import { Request, Response } from "express";
import { createCalendarAdapterFromDB } from "../lib/calendar";
import {
  buildCalendarEventPayload,
  normalizeCalendarEvent,
  readJsonResponse,
  requireAdmin,
  validateCalendarEventPayload,
} from "./apiSupport";

export class CalendarEventsController {
  list = async (req: Request, res: Response) => {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const query = new URLSearchParams({
        select: "id,tutor_id,animal_id,interest_id,title,description,location,starts_at,ends_at,status,provider,external_event_id,external_event_url,metadata,created_by,created_at,updated_at,tutor:tutors(id,name),animal:animals(id,name,species)",
        order: "starts_at.asc",
      });

      if (typeof req.query.from === "string" && req.query.from) query.set("starts_at", `gte.${req.query.from}`);
      if (typeof req.query.to === "string" && req.query.to) query.set("ends_at", `lte.${req.query.to}`);

      const response = await fetch(`${context.supabaseUrl}/rest/v1/calendar_events?${query.toString()}`, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
        },
      });
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel listar os eventos do calendario.", details: body });
        return;
      }

      res.json(Array.isArray(body) ? body.map(normalizeCalendarEvent) : []);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel carregar o calendario.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const payload = buildCalendarEventPayload(req.body ?? {}, context.admin.id);
      const validationMessage = validateCalendarEventPayload(payload);
      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
      }

      let externalEventId: string | null = null;
      let externalEventUrl: string | null = null;
      let provider: string | null = null;

      const adapter = payload.provider ? await createCalendarAdapterFromDB(context.supabaseUrl, context.serviceRoleKey) : null;
      if (adapter) {
        try {
          const externalEvent = await adapter.createEvent({
            title: String(payload.title),
            description: payload.description ? String(payload.description) : undefined,
            location: payload.location ? String(payload.location) : undefined,
            start: { dateTime: String(payload.starts_at), timeZone: "America/Sao_Paulo" },
            end: { dateTime: String(payload.ends_at), timeZone: "America/Sao_Paulo" },
          });
          externalEventId = externalEvent.id;
          externalEventUrl = externalEvent.htmlLink ?? null;
          provider = externalEvent.provider;
        } catch (syncError) {
          console.error("Erro ao sincronizar com calendario externo:", syncError);
        }
      }

      const response = await fetch(`${context.supabaseUrl}/rest/v1/calendar_events`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify({
          ...payload,
          external_event_id: externalEventId,
          external_event_url: externalEventUrl,
          provider,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel criar o evento do calendario.", details: body });
        return;
      }

      res.status(201).json(normalizeCalendarEvent(Array.isArray(body) ? body[0] : body));
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel criar o evento do calendario.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const { id } = req.params;
      const payload = buildCalendarEventPayload(req.body ?? {}, context.admin.id, true);
      const validationMessage = validateCalendarEventPayload(payload, true);
      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
      }

      const existingResponse = await fetch(`${context.supabaseUrl}/rest/v1/calendar_events?id=eq.${encodeURIComponent(id)}&select=*`, {
        headers: { apikey: context.serviceRoleKey, authorization: `Bearer ${context.serviceRoleKey}` },
      });
      const existingBody = await existingResponse.json();
      const existingEvent = Array.isArray(existingBody) ? existingBody[0] : null;

      if (existingEvent?.external_event_id) {
        const adapter = await createCalendarAdapterFromDB(context.supabaseUrl, context.serviceRoleKey);
        if (adapter) {
          try {
            await adapter.updateEvent({
              id: String(existingEvent.external_event_id),
              title: payload.title ? String(payload.title) : String(existingEvent.title),
              description: payload.description ? String(payload.description) : (existingEvent.description ? String(existingEvent.description) : undefined),
              location: payload.location ? String(payload.location) : (existingEvent.location ? String(existingEvent.location) : undefined),
              start: { dateTime: payload.starts_at ? String(payload.starts_at) : String(existingEvent.starts_at), timeZone: "America/Sao_Paulo" },
              end: { dateTime: payload.ends_at ? String(payload.ends_at) : String(existingEvent.ends_at), timeZone: "America/Sao_Paulo" },
            });
          } catch (syncError) {
            console.error("Erro ao atualizar calendario externo:", syncError);
          }
        }
      }

      const response = await fetch(`${context.supabaseUrl}/rest/v1/calendar_events?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel atualizar o evento do calendario.", details: body });
        return;
      }

      res.json(normalizeCalendarEvent(Array.isArray(body) ? body[0] : body));
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel atualizar o evento do calendario.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const { id } = req.params;
      const existingResponse = await fetch(`${context.supabaseUrl}/rest/v1/calendar_events?id=eq.${encodeURIComponent(id)}&select=external_event_id`, {
        headers: { apikey: context.serviceRoleKey, authorization: `Bearer ${context.serviceRoleKey}` },
      });
      const existingBody = await existingResponse.json();
      const existingEvent = Array.isArray(existingBody) ? existingBody[0] : null;

      if (existingEvent?.external_event_id) {
        const adapter = await createCalendarAdapterFromDB(context.supabaseUrl, context.serviceRoleKey);
        if (adapter) {
          try {
            await adapter.deleteEvent(String(existingEvent.external_event_id));
          } catch (syncError) {
            console.error("Erro ao remover do calendario externo:", syncError);
          }
        }
      }

      const response = await fetch(`${context.supabaseUrl}/rest/v1/calendar_events?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          prefer: "return=representation",
        },
      });
      const body = await readJsonResponse(response);

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel remover o evento do calendario.", details: body });
        return;
      }

      res.status(200).json({ deleted: true, rows: body });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel remover o evento do calendario.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };
}
