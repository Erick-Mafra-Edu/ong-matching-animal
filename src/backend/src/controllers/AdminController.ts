import { Request, Response } from "express";
import {
  buildCalendarEventPayload,
  getAdminTable,
  normalizeAnimal,
  normalizeCalendarEvent,
  normalizeInterestSummary,
  pickFields,
  readJsonResponse,
  requireAdmin,
  validateCalendarEventPayload,
} from "./apiSupport";

export class AdminController {
  getMe = async (req: Request, res: Response) => {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;
      res.json(context.admin);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel validar o administrador.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  listResource = async (req: Request, res: Response) => {
    const config = getAdminTable(req.params.resource);
    if (!config) {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      let url = `${context.supabaseUrl}/rest/v1/${config.table}?select=${config.select}&order=${config.order}`;
      const q = req.query.q as string;
      if (q) {
        if (req.params.resource === "tutors" || req.params.resource === "animals") {
          url += `&name=ilike.*${encodeURIComponent(q)}*`;
        } else if (req.params.resource === "admin-users") {
          url += `&email=ilike.*${encodeURIComponent(q)}*`;
        } else if (req.params.resource === "calendar-events") {
          url += `&title=ilike.*${encodeURIComponent(q)}*`;
        } else if (req.params.resource === "tutor-interessados") {
          url += `&or=(tutor.name.ilike.*${encodeURIComponent(q)}*,animal.name.ilike.*${encodeURIComponent(q)}*)`;
        }
      }

      const response = await fetch(url, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
        },
      });
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel listar o recurso.", details: body });
        return;
      }

      if (Array.isArray(body) && req.params.resource === "animals") {
        res.json(body.map(normalizeAnimal));
        return;
      }
      if (Array.isArray(body) && req.params.resource === "tutor-interessados") {
        res.json(body.map(normalizeInterestSummary));
        return;
      }
      if (Array.isArray(body) && req.params.resource === "calendar-events") {
        res.json(body.map(normalizeCalendarEvent));
        return;
      }

      res.json(body);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  createAdminUser = async (req: Request, res: Response) => {
    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const { email, password, full_name, is_active = true } = req.body as {
        email?: string;
        password?: string;
        full_name?: string;
        is_active?: boolean;
      };

      if (!email || !password || password.length < 8) {
        res.status(400).json({ message: "Informe email e uma senha temporaria com pelo menos 8 caracteres." });
        return;
      }

      const authResponse = await fetch(`${context.supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name ?? email.split("@")[0], role: "admin" },
        }),
      });
      const authBody = await readJsonResponse(authResponse) as { id?: string; user?: { id?: string } } | null;

      if (!authResponse.ok) {
        res.status(authResponse.status).json({ message: "Nao foi possivel criar a conta no Supabase Auth.", details: authBody });
        return;
      }

      const authUserId = authBody?.id ?? authBody?.user?.id;
      if (!authUserId) {
        res.status(502).json({ message: "Supabase Auth nao retornou o id do usuario criado." });
        return;
      }

      const insertResponse = await fetch(`${context.supabaseUrl}/rest/v1/admin_users`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify({
          auth_user_id: authUserId,
          email,
          is_active,
          created_by: context.admin.auth_user_id,
        }),
      });
      const insertBody = await insertResponse.json();

      if (!insertResponse.ok) {
        res.status(insertResponse.status).json({ message: "Conta criada, mas nao foi possivel marcar como administradora.", details: insertBody });
        return;
      }

      res.status(201).json(Array.isArray(insertBody) ? insertBody[0] : insertBody);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel criar o administrador.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  createResource = async (req: Request, res: Response) => {
    const config = getAdminTable(req.params.resource);
    if (!config || req.params.resource === "admin-users") {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const payload = req.params.resource === "calendar-events"
        ? buildCalendarEventPayload(req.body ?? {}, context.admin.id)
        : pickFields(req.body ?? {}, config.createFields);
      if (req.params.resource === "calendar-events") {
        const validationMessage = validateCalendarEventPayload(payload);
        if (validationMessage) {
          res.status(400).json({ message: validationMessage });
          return;
        }
      }

      const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}`, {
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
        res.status(response.status).json({ message: "Nao foi possivel criar o recurso.", details: body });
        return;
      }

      res.status(201).json(Array.isArray(body) ? body[0] : body);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  updateResource = async (req: Request, res: Response) => {
    const config = getAdminTable(req.params.resource);
    if (!config) {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const payload = req.params.resource === "calendar-events"
        ? buildCalendarEventPayload(req.body ?? {}, context.admin.id, true)
        : pickFields(req.body ?? {}, config.updateFields);
      if (req.params.resource === "calendar-events") {
        const validationMessage = validateCalendarEventPayload(payload, true);
        if (validationMessage) {
          res.status(400).json({ message: validationMessage });
          return;
        }
      }
      if (req.params.resource === "admin-users") payload.updated_at = new Date().toISOString();

      const idField = "idField" in config ? config.idField : "id";
      const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}?${idField}=eq.${encodeURIComponent(req.params.id)}`, {
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
        res.status(response.status).json({ message: "Nao foi possivel atualizar o recurso.", details: body });
        return;
      }

      res.json(Array.isArray(body) ? body[0] : body);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  deleteResource = async (req: Request, res: Response) => {
    const config = getAdminTable(req.params.resource);
    if (!config) {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const idField = "idField" in config ? config.idField : "id";
      const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}?${idField}=eq.${encodeURIComponent(req.params.id)}`, {
        method: "DELETE",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          prefer: "return=representation",
        },
      });
      const body = await readJsonResponse(response);

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel remover o recurso.", details: body });
        return;
      }

      res.status(200).json({ deleted: true, rows: body });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };
}
