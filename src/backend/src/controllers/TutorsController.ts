import { Request, Response } from "express";
import {
  getAuthenticatedUserId,
  getAuthenticatedUserIdFromTokenPayload,
  getSupabaseBackendConfig,
  getSupabasePublicConfig,
  pickFields,
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
        body: JSON.stringify({ auth_user_id, name, custom_fields }),
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

      const response = await fetch(`${supabaseUrl}/rest/v1/tutors?select=custom_fields&auth_user_id=eq.${encodeURIComponent(authenticatedUserId)}&limit=1`, {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
      });
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel carregar o status de onboarding", details: body });
        return;
      }

      const profile = Array.isArray(body) ? body[0] : null;
      const customFields = profile?.custom_fields && typeof profile.custom_fields === "object" ? profile.custom_fields : {};
      res.json({ onboarding_complete: customFields.onboarding_complete === true });
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
      const { supabaseUrl, publishableKey } = getSupabasePublicConfig();

      if (!supabaseUrl || !publishableKey) {
        res.status(500).json({ message: "Variaveis publicas do Supabase nao configuradas" });
        return;
      }

      if (!authorization || !userId) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/tutors?select=id,custom_fields&auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
        headers: {
          apikey: publishableKey,
          authorization,
        },
      });

      if (response.status === 401 || response.status === 403) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }

      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel carregar o acesso ao discover", details: body });
        return;
      }

      const profile = Array.isArray(body) ? body[0] : null;
      const customFields = profile?.custom_fields && typeof profile.custom_fields === "object" ? profile.custom_fields : {};
      res.json({
        authenticated: true,
        onboarding_complete: customFields.onboarding_complete === true,
        tutor_id: profile?.id ?? null,
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
