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
      const validationMessage = await validateAdminPayload(req.params.resource, payload, context.supabaseUrl, context.serviceRoleKey);
      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
      }
      if (req.params.resource === "calendar-events") {
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
      const validationMessage = await validateAdminPayload(req.params.resource, payload, context.supabaseUrl, context.serviceRoleKey);
      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
      }
      if (req.params.resource === "calendar-events") {
        const calendarValidationMessage = validateCalendarEventPayload(payload, true);
        if (calendarValidationMessage) {
          res.status(400).json({ message: calendarValidationMessage });
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

async function validateAdminPayload(resource: string, payload: Record<string, unknown>, supabaseUrl: string, serviceRoleKey: string) {
  if (resource === "custom-fields") {
    return validateCustomFieldPayload(payload, supabaseUrl, serviceRoleKey);
  }

  if (resource === "tutors" && Object.prototype.hasOwnProperty.call(payload, "custom_fields")) {
    return validateTutorCustomFields(payload.custom_fields, supabaseUrl, serviceRoleKey);
  }

  return null;
}

async function validateCustomFieldPayload(payload: Record<string, unknown>, supabaseUrl: string, serviceRoleKey: string) {
  const entityType = String(payload.entity_type ?? "");
  if (payload.source_question_id === "") payload.source_question_id = null;
  if (entityType !== "tutor") {
    payload.source_question_id = null;
    return null;
  }

  const sourceQuestionId = typeof payload.source_question_id === "string" ? payload.source_question_id.trim() : "";
  if (!sourceQuestionId) {
    return "Campos customizados de tutor precisam estar vinculados a uma pergunta de onboarding.";
  }

  const questionIds = await fetchActiveOnboardingQuestionIds(supabaseUrl, serviceRoleKey);
  if (!questionIds.has(sourceQuestionId)) {
    return "A pergunta vinculada ao campo customizado de tutor nao existe ou esta inativa.";
  }

  payload.source_question_id = sourceQuestionId;
  return null;
}

async function validateTutorCustomFields(customFields: unknown, supabaseUrl: string, serviceRoleKey: string) {
  if (!customFields || typeof customFields !== "object" || Array.isArray(customFields)) return null;

  const allowedKeys = await fetchTutorCustomFieldKeys(supabaseUrl, serviceRoleKey);
  const invalidKeys = Object.keys(customFields as Record<string, unknown>)
    .filter((key) => !allowedKeys.has(key));

  if (invalidKeys.length > 0) {
    return `Campos customizados de tutor sem pergunta vinculada: ${invalidKeys.join(", ")}.`;
  }

  return null;
}

async function fetchActiveOnboardingQuestionIds(supabaseUrl: string, serviceRoleKey: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/onboarding_questions?select=id&is_active=eq.true`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  const body = await response.json() as Array<{ id?: string }>;
  return new Set(body.map((question) => question.id).filter((id): id is string => Boolean(id)));
}

async function fetchTutorCustomFieldKeys(supabaseUrl: string, serviceRoleKey: string) {
  const [questions, customFieldsResponse] = await Promise.all([
    fetchActiveOnboardingQuestionIds(supabaseUrl, serviceRoleKey),
    fetch(`${supabaseUrl}/rest/v1/custom_fields?select=field_key,source_question_id&entity_type=eq.tutor&is_active=eq.true&source_question_id=not.is.null`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    }),
  ]);
  const customFields = await customFieldsResponse.json() as Array<{ field_key?: string; source_question_id?: string | null }>;
  const allowedKeys = new Set<string>(["onboarding_complete", ...questions]);

  for (const field of customFields) {
    if (field.field_key && field.source_question_id && questions.has(field.source_question_id)) {
      allowedKeys.add(field.field_key);
    }
  }

  return allowedKeys;
}
