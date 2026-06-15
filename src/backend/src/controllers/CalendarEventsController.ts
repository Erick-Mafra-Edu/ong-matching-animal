import { Request, Response } from "express";
import {
  buildCalendarEventPayload,
  getRouteParam,
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

      const response = await fetch(`${context.supabaseUrl}/rest/v1/calendar_events`, {
        method: "POST",
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

      const id = getRouteParam(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Identificador do evento invalido." });
        return;
      }
      const payload = buildCalendarEventPayload(req.body ?? {}, context.admin.id, true);
      const validationMessage = validateCalendarEventPayload(payload, true);
      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
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

      const id = getRouteParam(req.params.id);
      if (!id) {
        res.status(400).json({ message: "Identificador do evento invalido." });
        return;
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
