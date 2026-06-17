import { Request, Response } from "express";
import {
  AdminContext,
  buildCalendarEventPayload,
  getRouteParam,
  getAdminTable,
  normalizeAnimal,
  normalizeCalendarEvent,
  normalizeInterestSummary,
  pickFields,
  readJsonResponse,
  requireAdmin,
  validateCalendarEventPayload,
  validateResourcePayload,
} from "./apiSupport";
import { logAdminAction } from "../lib/audit";

async function fetchAdminResourceRows(resource: string, context: NonNullable<AdminContext>, q?: string) {
  const config = getAdminTable(resource);
  if (!config) {
    throw new Error("Recurso administrativo nao encontrado.");
  }

  let url = `${context.supabaseUrl}/rest/v1/${config.table}?select=${config.select}&order=${config.order}`;
  if (q) {
    if (resource === "tutors" || resource === "animals") {
      url += `&name=ilike.*${encodeURIComponent(q)}*`;
    } else if (resource === "admin-users") {
      url += `&email=ilike.*${encodeURIComponent(q)}*`;
    } else if (resource === "calendar-events") {
      url += `&title=ilike.*${encodeURIComponent(q)}*`;
    } else if (resource === "tutor-interessados") {
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
    return {
      ok: false as const,
      response,
      body,
    };
  }

  if (Array.isArray(body) && resource === "animals") {
    return { ok: true as const, body: body.map(normalizeAnimal) };
  }
  if (Array.isArray(body) && resource === "tutor-interessados") {
    return { ok: true as const, body: body.map(normalizeInterestSummary) };
  }
  if (Array.isArray(body) && resource === "calendar-events") {
    return { ok: true as const, body: body.map(normalizeCalendarEvent) };
  }

  return { ok: true as const, body };
}

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
    const resource = getRouteParam(req.params.resource);
    const config = resource ? getAdminTable(resource) : null;
    if (!resource || !config) {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;
      const result = await fetchAdminResourceRows(resource, context, req.query.q as string | undefined);
      if (!result.ok) {
        res.status(result.response.status).json({ message: "Nao foi possivel listar o recurso.", details: result.body });
        return;
      }

      res.json(result.body);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  getBootstrap = async (req: Request, res: Response) => {
    const resource = String(req.query.resource ?? "admin-users");
    const config = getAdminTable(resource);
    if (!config) {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const [customFieldsResult, onboardingQuestionsResult, resourceResult] = await Promise.all([
        fetchAdminResourceRows("custom-fields", context),
        fetchAdminResourceRows("onboarding-questions", context),
        fetchAdminResourceRows(resource, context),
      ]);

      const firstFailure = [customFieldsResult, onboardingQuestionsResult, resourceResult].find((result) => !result.ok);
      if (firstFailure && !firstFailure.ok) {
        res.status(firstFailure.response.status).json({
          message: "Nao foi possivel carregar o bootstrap do painel.",
          details: firstFailure.body,
        });
        return;
      }

      res.json({
        admin: context.admin,
        custom_fields: customFieldsResult.body,
        onboarding_questions: onboardingQuestionsResult.body,
        resource,
        rows: resourceResult.body,
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel carregar o bootstrap do painel.",
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
      await logAdminAction({
        auth_user_id: context.admin.auth_user_id,
        action: "CREATE",
        resource: "admin-user",
        resource_id: authUserId,
        details: { email, full_name, is_active },
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel criar o administrador.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  createResource = async (req: Request, res: Response) => {
    const resource = getRouteParam(req.params.resource);
    const config = resource ? getAdminTable(resource) : null;
    if (!resource || !config || resource === "admin-users") {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const payload = resource === "calendar-events"
        ? buildCalendarEventPayload(req.body ?? {}, context.admin.id)
        : pickFields(req.body ?? {}, config.createFields);
      const validationMessage = await validateResourcePayload(resource, payload, context.supabaseUrl, context.serviceRoleKey);
      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
      }
      if (resource === "calendar-events") {
        const calendarValidationMessage = validateCalendarEventPayload(payload);
        if (calendarValidationMessage) {
          res.status(400).json({ message: calendarValidationMessage });
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

      const createdResource = Array.isArray(body) ? body[0] : body;
      res.status(201).json(createdResource);
      const newResourceId = createdResource?.id;
      await logAdminAction({
        auth_user_id: context.admin.auth_user_id,
        action: "CREATE",
        resource,
        resource_id: String(newResourceId),
        details: payload,
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  updateResource = async (req: Request, res: Response) => {
    const resource = getRouteParam(req.params.resource);
    const resourceId = getRouteParam(req.params.id);
    const config = resource ? getAdminTable(resource) : null;
    if (!resource || !config) {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      const payload = resource === "calendar-events"
        ? buildCalendarEventPayload(req.body ?? {}, context.admin.id, true)
        : pickFields(req.body ?? {}, config.updateFields);
      const validationMessage = await validateResourcePayload(resource, payload, context.supabaseUrl, context.serviceRoleKey, true);
      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
      }
      if (resource === "calendar-events") {
        const calendarValidationMessage = validateCalendarEventPayload(payload, true);
        if (calendarValidationMessage) {
          res.status(400).json({ message: calendarValidationMessage });
          return;
        }
      }
      if (resource === "admin-users") payload.updated_at = new Date().toISOString();
      if (resource === "ong-settings") payload.updated_at = new Date().toISOString();
      if (resource === "onboarding-questions") payload.updated_at = new Date().toISOString();

      if (!resourceId) {
        res.status(400).json({ message: "Identificador do recurso invalido." });
        return;
      }

      const idField = "idField" in config ? config.idField : "id";
      const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}?${idField}=eq.${encodeURIComponent(resourceId)}`, {
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
      await logAdminAction({
        auth_user_id: context.admin.auth_user_id,
        action: "UPDATE",
        resource,
        resource_id: resourceId,
        details: payload,
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  deleteResource = async (req: Request, res: Response) => {
    const resource = getRouteParam(req.params.resource);
    const resourceId = getRouteParam(req.params.id);
    const config = resource ? getAdminTable(resource) : null;
    if (!resource || !config) {
      res.status(404).json({ message: "Recurso administrativo nao encontrado." });
      return;
    }

    try {
      const context = await requireAdmin(req, res);
      if (!context) return;

      if (!resourceId) {
        res.status(400).json({ message: "Identificador do recurso invalido." });
        return;
      }

      const idField = "idField" in config ? config.idField : "id";
      const response = await fetch(`${context.supabaseUrl}/rest/v1/${config.table}?${idField}=eq.${encodeURIComponent(resourceId)}`, {
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
      await logAdminAction({
        auth_user_id: context.admin.auth_user_id,
        action: "DELETE",
        resource,
        resource_id: resourceId,
        details: { deletedRows: body },
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };
}
