import { Request, Response } from "express";
import {
  getBearerToken,
  getAuthenticatedUserId,
  getAuthenticatedUserIdFromTokenPayload,
  getSupabaseBackendConfig,
  getSupabasePublicConfig,
  pickFields,
  readJsonResponse,
  requireAuthenticated,
  validateTutorCustomFields,
} from "./apiSupport";

export class TutorsController {
  create = async (req: Request, res: Response) => {
    const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
      return;
    }

    const payload = pickFields(req.body ?? {}, ["auth_user_id", "name", "custom_fields"]);
    const { auth_user_id, name, custom_fields } = payload as {
      auth_user_id?: string;
      name?: string;
      custom_fields?: Record<string, unknown>;
    };

    if (!auth_user_id || !name || !custom_fields || typeof custom_fields !== "object") {
      res.status(400).json({ message: "Informe auth_user_id, name e custom_fields." });
      return;
    }

    try {
      const authenticatedUserId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, req.header("authorization"));
      if (!authenticatedUserId) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }

      if (authenticatedUserId !== auth_user_id) {
        res.status(403).json({ message: "Nao e permitido salvar perfil de outro usuario." });
        return;
      }

      const validationMessage = await validateTutorCustomFields(custom_fields, supabaseUrl, serviceRoleKey);
      if (validationMessage) {
        res.status(400).json({ message: validationMessage });
        return;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/tutors?on_conflict=auth_user_id`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          auth_user_id,
          name,
          custom_fields,
          ...(custom_fields.onboarding_complete === true ? { onboarding_completed_at: new Date().toISOString() } : {}),
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel salvar o tutor", details: body });
        return;
      }

      const savedTutor = Array.isArray(body) ? body[0] : body;

      if (custom_fields.onboarding_complete === true && savedTutor?.id) {
        const refreshResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/refresh_tutor_animal_matches`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ target_tutor_id: savedTutor.id }),
        });

        if (!refreshResponse.ok) {
          const refreshBody = await refreshResponse.json().catch(() => null);
          res.status(502).json({
            message: "Tutor salvo, mas nao foi possivel atualizar o cache de matching.",
            details: refreshBody,
          });
          return;
        }
      }

      res.status(201).json(savedTutor);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  getMe = async (req: Request, res: Response) => {
    try {
      const context = await requireAuthenticated(req, res);
      if (!context) return;

      const accessToken = getBearerToken(req.header("authorization"));
      if (!accessToken) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }
      const [authUserResponse, tutorResponse, questionsResponse] = await Promise.all([
        fetch(`${context.supabaseUrl}/auth/v1/user`, {
          headers: {
            apikey: context.serviceRoleKey,
            authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(`${context.supabaseUrl}/rest/v1/tutors?select=id,auth_user_id,name,custom_fields,onboarding_completed_at,created_at&auth_user_id=eq.${encodeURIComponent(context.userId)}&limit=1`, {
          headers: {
            apikey: context.serviceRoleKey,
            authorization: `Bearer ${context.serviceRoleKey}`,
          },
        }),
        fetch(`${context.supabaseUrl}/rest/v1/onboarding_questions?select=updated_at&is_active=eq.true&order=updated_at.desc&limit=1`, {
          headers: {
            apikey: context.serviceRoleKey,
            authorization: `Bearer ${context.serviceRoleKey}`,
          },
        }),
      ]);

      const authUser = await readJsonResponse(authUserResponse) as { email?: string; user_metadata?: Record<string, unknown> } | null;
      const tutorBody = await tutorResponse.json();
      const questionsBody = await questionsResponse.json();

      if (!authUserResponse.ok) {
        res.status(authUserResponse.status).json({ message: "Nao foi possivel carregar o usuario autenticado.", details: authUser });
        return;
      }

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel carregar o perfil.", details: tutorBody });
        return;
      }

      if (!questionsResponse.ok) {
        res.status(questionsResponse.status).json({ message: "Nao foi possivel carregar o status do questionario.", details: questionsBody });
        return;
      }

      const tutor = Array.isArray(tutorBody) ? tutorBody[0] : null;
      const latestQuestion = Array.isArray(questionsBody) ? questionsBody[0] : null;
      const onboardingCompletedAt = typeof tutor?.onboarding_completed_at === "string" ? tutor.onboarding_completed_at : null;
      const questionnaireUpdatedAt = typeof latestQuestion?.updated_at === "string" ? latestQuestion.updated_at : null;

      res.json({
        id: tutor?.id ?? null,
        auth_user_id: context.userId,
        email: authUser?.email ?? null,
        name: tutor?.name ?? authUser?.user_metadata?.full_name ?? authUser?.email?.split("@")[0] ?? "",
        onboarding_completed_at: onboardingCompletedAt,
        questionnaire_updated_at: questionnaireUpdatedAt,
        onboarding_outdated: isOnboardingOutdated(onboardingCompletedAt, questionnaireUpdatedAt),
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel carregar o perfil.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  updateMe = async (req: Request, res: Response) => {
    try {
      const context = await requireAuthenticated(req, res);
      if (!context) return;

      const name = String(req.body?.name ?? "").trim();
      if (name.length < 2 || name.length > 120) {
        res.status(400).json({ message: "Informe um nome entre 2 e 120 caracteres." });
        return;
      }

      const accessToken = getBearerToken(req.header("authorization"));
      if (!accessToken) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }

      const authUserResponse = await fetch(`${context.supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${accessToken}`,
        },
      });
      const authUser = await readJsonResponse(authUserResponse) as { user_metadata?: Record<string, unknown> } | null;

      if (!authUserResponse.ok) {
        res.status(authUserResponse.status).json({ message: "Nao foi possivel validar o usuario autenticado.", details: authUser });
        return;
      }

      const tutorResponse = await fetch(`${context.supabaseUrl}/rest/v1/tutors?on_conflict=auth_user_id`, {
        method: "POST",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
          prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({ auth_user_id: context.userId, name }),
      });
      const tutorBody = await tutorResponse.json();

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel atualizar o perfil.", details: tutorBody });
        return;
      }

      const authResponse = await fetch(`${context.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(context.userId)}`, {
        method: "PUT",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ user_metadata: { ...(authUser?.user_metadata ?? {}), full_name: name } }),
      });
      const authBody = await readJsonResponse(authResponse);

      if (!authResponse.ok) {
        res.status(authResponse.status).json({ message: "Perfil atualizado, mas nao foi possivel sincronizar o nome no Auth.", details: authBody });
        return;
      }

      res.json(Array.isArray(tutorBody) ? tutorBody[0] : tutorBody);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel atualizar o perfil.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  getOnboardingStatus = async (req: Request, res: Response) => {
    const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
      return;
    }

    try {
      const authenticatedUserId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, req.header("authorization"));
      if (!authenticatedUserId) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }

      const [profileResponse, questionsResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/tutors?select=custom_fields,onboarding_completed_at&auth_user_id=eq.${encodeURIComponent(authenticatedUserId)}&limit=1`, {
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
          },
        }),
        fetch(`${supabaseUrl}/rest/v1/onboarding_questions?select=updated_at&is_active=eq.true&order=updated_at.desc&limit=1`, {
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
          },
        }),
      ]);
      const body = await profileResponse.json();
      const questionsBody = await questionsResponse.json();

      if (!profileResponse.ok) {
        res.status(profileResponse.status).json({ message: "Nao foi possivel carregar o status de onboarding", details: body });
        return;
      }

      if (!questionsResponse.ok) {
        res.status(questionsResponse.status).json({ message: "Nao foi possivel carregar o status do questionario", details: questionsBody });
        return;
      }

      const profile = Array.isArray(body) ? body[0] : null;
      const latestQuestion = Array.isArray(questionsBody) ? questionsBody[0] : null;
      const customFields = profile?.custom_fields && typeof profile.custom_fields === "object" ? profile.custom_fields : {};
      const onboardingCompletedAt = typeof profile?.onboarding_completed_at === "string" ? profile.onboarding_completed_at : null;
      const questionnaireUpdatedAt = typeof latestQuestion?.updated_at === "string" ? latestQuestion.updated_at : null;
      res.json({
        onboarding_complete: customFields.onboarding_complete === true,
        onboarding_completed_at: onboardingCompletedAt,
        questionnaire_updated_at: questionnaireUpdatedAt,
        onboarding_outdated: isOnboardingOutdated(onboardingCompletedAt, questionnaireUpdatedAt),
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  getDiscoverAccess = async (req: Request, res: Response) => {
    try {
      const authorization = req.header("authorization");
      const userId = getAuthenticatedUserIdFromTokenPayload(authorization);
      const { supabaseUrl } = getSupabasePublicConfig();
      const { serviceRoleKey } = getSupabaseBackendConfig();

      if (!supabaseUrl || !serviceRoleKey) {
        res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
        return;
      }

      if (!authorization || !userId) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }

      // Chamada à nova função RPC
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_discover_access`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ target_user_id: userId }),
      });

      if (rpcResponse.status === 401 || rpcResponse.status === 403) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }

      const resultData = await rpcResponse.json();

      if (!rpcResponse.ok) {
        console.error("RPC Error (Status " + rpcResponse.status + "):", JSON.stringify(resultData));
        res.status(rpcResponse.status).json({ 
          message: "Nao foi possivel carregar o acesso ao discover via banco", 
          details: resultData 
        });
        return;
      }

      // Tipando estritamente para prever que campos podem vir nulos ou indefinidos do mock/banco
      const accessData = (resultData as {
        tutor_id?: string | null;
        onboarding_completed_at?: string | null;
        is_admin?: boolean | null;
        questionnaire_updated_at?: string | null;
      }) ?? {};

      const onboardingCompletedAt = accessData.onboarding_completed_at ?? null;
      const questionnaireUpdatedAt = accessData.questionnaire_updated_at ?? null;

      // Montando a resposta garantindo que NENHUMA chave fique como undefined
      res.json({
        authenticated: true,
        onboarding_complete: onboardingCompletedAt !== null,
        onboarding_completed_at: onboardingCompletedAt,
        questionnaire_updated_at: questionnaireUpdatedAt,
        onboarding_outdated: isOnboardingOutdated(onboardingCompletedAt, questionnaireUpdatedAt),
        tutor_id: accessData.tutor_id ?? null,
        is_admin: accessData.is_admin ?? false,
      });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  getById = (_req: Request, res: Response) => {
    res.json({ message: "Implementar carregamento de tutor do Supabase" });
  };
}

function isOnboardingOutdated(completedAt: string | null, questionnaireUpdatedAt: string | null) {
  if (!completedAt || !questionnaireUpdatedAt) return false;
  return new Date(questionnaireUpdatedAt).getTime() > new Date(completedAt).getTime();
}