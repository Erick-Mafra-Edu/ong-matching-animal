import { Request, Response } from "express";
import { getAuthenticatedUserId, getRouteParam, getSupabaseBackendConfig, normalizeAnimal, normalizeCalendarEvent, normalizeTutor } from "./apiSupport";

export class InterestsController {
  listMine = async (req: Request, res: Response) => {
    try {
      const context = await requireAuthenticatedContext(req, res);
      if (!context) return;

      const tutorResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutors?select=id,auth_user_id,name&auth_user_id=eq.${encodeURIComponent(context.userId)}&limit=1`, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
        },
      });
      const tutorBody = await tutorResponse.json();

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel localizar o tutor.", details: tutorBody });
        return;
      }

      const tutor = Array.isArray(tutorBody) ? tutorBody[0] : null;
      if (!tutor?.id) {
        res.status(404).json({ message: "Cadastro de tutor nao encontrado." });
        return;
      }

      const interestsResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutor_interessados?select=uuid_registro,tutor_id,animal_id,data_registro,animal:animals(id,owner_id,name,species,custom_fields,created_at,animal_photos(id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at))&tutor_id=eq.${encodeURIComponent(tutor.id)}&order=data_registro.desc`, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
        },
      });
      const interestsBody = await interestsResponse.json();

      if (!interestsResponse.ok) {
        res.status(interestsResponse.status).json({ message: "Nao foi possivel listar seus interesses.", details: interestsBody });
        return;
      }

      const interests = Array.isArray(interestsBody) ? interestsBody : [];
      const interestIds = interests.map((interest) => interest.uuid_registro).filter(Boolean).map(String);
      const scheduleByInterest = await loadSchedulesByInterestIds(context.supabaseUrl, context.serviceRoleKey, interestIds);

      res.json(interests.map((interest) => {
        const schedule = scheduleByInterest.get(String(interest.uuid_registro)) ?? [];
        return {
          uuid_registro: interest.uuid_registro,
          tutor_id: interest.tutor_id,
          animal_id: interest.animal_id,
          data_registro: interest.data_registro,
          detail_url: `/interessados/${interest.uuid_registro}`,
          animal: normalizeAnimal(interest.animal ?? {}),
          schedule,
          has_schedule: schedule.length > 0,
        };
      }));
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel listar seus interesses.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  create = async (req: Request, res: Response) => {
    const { animal_id } = req.body as { animal_id?: string };
    if (!animal_id) {
      res.status(400).json({ message: "Informe animal_id." });
      return;
    }

    try {
      const context = await requireAuthenticatedContext(req, res);
      if (!context) return;

      const tutorResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutors?select=id,auth_user_id,name&auth_user_id=eq.${encodeURIComponent(context.userId)}&limit=1`, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
        },
      });
      const tutorBody = await tutorResponse.json();

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel localizar o tutor.", details: tutorBody });
        return;
      }

      const tutor = Array.isArray(tutorBody) ? tutorBody[0] : null;
      if (!tutor?.id) {
        res.status(404).json({ message: "Complete o cadastro de tutor antes de registrar interesse." });
        return;
      }

      const insertResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutor_interessados`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify({ tutor_id: tutor.id, animal_id }),
      });
      const insertBody = await insertResponse.json();

      if (!insertResponse.ok) {
        res.status(insertResponse.status).json({ message: "Nao foi possivel registrar o interesse.", details: insertBody });
        return;
      }

      const interest = Array.isArray(insertBody) ? insertBody[0] : insertBody;
      res.status(201).json({ ...interest, detail_url: `/interessados/${interest.uuid_registro}` });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel registrar o interesse.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  getDetail = async (req: Request, res: Response) => {
    try {
      const context = await requireInterestDetailContext(req, res);
      if (!context) return;
      const interestId = getRouteParam(req.params.uuid_registro);
      if (!interestId) {
        res.status(400).json({ message: "Identificador do interesse invalido." });
        return;
      }

      const interestResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutor_interessados?select=uuid_registro,tutor_id,animal_id,data_registro&uuid_registro=eq.${encodeURIComponent(interestId)}&limit=1`, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
        },
      });
      const interestBody = await interestResponse.json();

      if (!interestResponse.ok) {
        res.status(interestResponse.status).json({ message: "Nao foi possivel carregar o registro de interesse.", details: interestBody });
        return;
      }

      const interest = Array.isArray(interestBody) ? interestBody[0] : null;
      if (!interest) {
        res.status(404).json({ message: "Registro de interesse nao encontrado." });
        return;
      }

      const [tutorResponse, animalResponse, scheduleResponse] = await Promise.all([
        fetch(`${context.supabaseUrl}/rest/v1/tutors?select=id,auth_user_id,name,location,custom_fields,created_at&id=eq.${encodeURIComponent(interest.tutor_id)}&limit=1`, {
          headers: {
            apikey: context.serviceRoleKey,
            authorization: `Bearer ${context.serviceRoleKey}`,
          },
        }),
        fetch(`${context.supabaseUrl}/rest/v1/animals?select=id,owner_id,name,species,custom_fields,created_at,animal_photos(id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at)&id=eq.${encodeURIComponent(interest.animal_id)}&limit=1`, {
          headers: {
            apikey: context.serviceRoleKey,
            authorization: `Bearer ${context.serviceRoleKey}`,
          },
        }),
        fetch(`${context.supabaseUrl}/rest/v1/calendar_events?select=id,tutor_id,animal_id,interest_id,title,description,location,starts_at,ends_at,status,provider,external_event_id,external_event_url,metadata,created_by,created_at,updated_at,tutor:tutors(id,name),animal:animals(id,name,species)&interest_id=eq.${encodeURIComponent(interest.uuid_registro)}&order=starts_at.asc`, {
          headers: {
            apikey: context.serviceRoleKey,
            authorization: `Bearer ${context.serviceRoleKey}`,
          },
        }),
      ]);

      const tutorBody = await tutorResponse.json();
      const animalBody = await animalResponse.json();
      const scheduleBody = await scheduleResponse.json();

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel carregar o tutor.", details: tutorBody });
        return;
      }

      if (!animalResponse.ok) {
        res.status(animalResponse.status).json({ message: "Nao foi possivel carregar o animal.", details: animalBody });
        return;
      }

      if (!scheduleResponse.ok) {
        res.status(scheduleResponse.status).json({ message: "Nao foi possivel carregar a agenda do interesse.", details: scheduleBody });
        return;
      }

      const tutor = Array.isArray(tutorBody) ? tutorBody[0] : {};
      if (!context.isAdmin && tutor?.auth_user_id !== context.userId) {
        res.status(403).json({ message: "Voce nao tem permissao para acessar este registro de interesse." });
        return;
      }

      const schedule = Array.isArray(scheduleBody) ? scheduleBody.map(normalizeCalendarEvent) : [];
      res.json({
        ...interest,
        tutor: normalizeTutor(tutor),
        animal: normalizeAnimal(Array.isArray(animalBody) ? animalBody[0] : {}),
        schedule,
        has_schedule: schedule.length > 0,
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel carregar o registro de interesse.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };
}

async function requireAuthenticatedContext(req: Request, res: Response) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return null;
  }

  const userId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, req.header("authorization"));
  if (!userId) {
    res.status(401).json({ message: "Sessao invalida ou ausente." });
    return null;
  }

  return { supabaseUrl, serviceRoleKey, userId };
}

async function requireInterestDetailContext(req: Request, res: Response) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return null;
  }

  const userId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, req.header("authorization"));
  if (!userId) {
    res.status(401).json({ message: "Sessao invalida ou ausente." });
    return null;
  }

  const adminResponse = await fetch(`${supabaseUrl}/rest/v1/admin_users?select=id,auth_user_id,email,is_active&auth_user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!adminResponse.ok) {
    res.status(403).json({ message: "Nao foi possivel validar permissoes do usuario." });
    return null;
  }

  const admins = await adminResponse.json() as Array<{ id: string; auth_user_id: string; email: string; is_active: boolean }>;
  return {
    supabaseUrl,
    serviceRoleKey,
    userId,
    isAdmin: Boolean(admins[0]),
  };
}

async function loadSchedulesByInterestIds(supabaseUrl: string, serviceRoleKey: string, interestIds: string[]) {
  const scheduleByInterest = new Map<string, ReturnType<typeof normalizeCalendarEvent>[]>();
  if (!interestIds.length) return scheduleByInterest;

  const encodedIds = interestIds.map((id) => `"${id.replace(/"/g, "\"\"")}"`).join(",");
  const response = await fetch(`${supabaseUrl}/rest/v1/calendar_events?select=id,tutor_id,animal_id,interest_id,title,description,location,starts_at,ends_at,status,provider,external_event_id,external_event_url,metadata,created_by,created_at,updated_at,tutor:tutors(id,name),animal:animals(id,name,species)&interest_id=in.(${encodedIds})&order=starts_at.asc`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error("Nao foi possivel carregar a agenda dos interesses.");

  for (const event of Array.isArray(body) ? body.map(normalizeCalendarEvent) : []) {
    if (!event.interest_id) continue;
    scheduleByInterest.set(event.interest_id, [...(scheduleByInterest.get(event.interest_id) ?? []), event]);
  }

  return scheduleByInterest;
}
