import { Request, Response } from "express";
import type { MatchResponse, MatchResult } from "@ong-matching-animal/shared/types";
import { getSupabaseBackendConfig, readJsonResponse } from "./apiSupport";

export class SystemController {
  getHealth = (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  };

  getOngSettings = async (_req: Request, res: Response) => {
    const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
      return;
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/ong_settings?select=id,ong_name,contact_email,contact_phone,whatsapp_phone,website_url,address_line,city,state,postal_code,social_links,business_hours,adoption_message_template,settings&is_active=eq.true&limit=1`, {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
      });
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel carregar as configuracoes da ONG", details: body });
        return;
      }

      res.json(Array.isArray(body) ? body[0] ?? null : body);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel conectar ao Supabase",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };

  listOnboardingQuestions = async (_req: Request, res: Response) => {
    const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
      return;
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/onboarding_questions?select=id,label,description,placeholder,type,options,required&is_active=eq.true&order=sort_order.asc`, {
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
        },
      });
      const body = await response.json();

      if (!response.ok) {
        res.status(response.status).json({ message: "Nao foi possivel carregar as perguntas", details: body });
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

  match = async (req: Request, res: Response) => {
    const { tutor_id, limit = 10, max_distance_km = 50 } = req.body as {
      tutor_id?: string;
      limit?: number;
      max_distance_km?: number | null;
    };
    if (!tutor_id) {
      res.status(400).json({ message: "Informe tutor_id." });
      return;
    }

    const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
      return;
    }

    try {
      const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 50) : 10;
      const safeDistanceKm = max_distance_km === null
        ? null
        : (Number.isFinite(Number(max_distance_km)) ? Math.max(Number(max_distance_km), 0) : 50);

      const [tutorResponse, matchesResponse, animalsCountResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/tutors?select=id,auth_user_id,name,location,custom_fields,created_at&id=eq.${encodeURIComponent(tutor_id)}&limit=1`, {
          headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
        }),
        fetch(`${supabaseUrl}/rest/v1/rpc/calculate_match_score`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            target_tutor_id: tutor_id,
            result_limit: safeLimit,
            max_distance_km: safeDistanceKm,
          }),
        }),
        fetch(`${supabaseUrl}/rest/v1/rpc/count_match_candidates_for_tutor`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            target_tutor_id: tutor_id,
            max_distance_km: safeDistanceKm,
          }),
        }),
      ]);

      const tutorBody = await readJsonResponse(tutorResponse);
      const matchesBody = await readJsonResponse(matchesResponse);
      const animalsCountBody = await readJsonResponse(animalsCountResponse);

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel carregar o tutor.", details: tutorBody });
        return;
      }
      if (!matchesResponse.ok) {
        res.status(matchesResponse.status).json({ message: "Nao foi possivel calcular os matches via RPC.", details: matchesBody });
        return;
      }
      if (!animalsCountResponse.ok) {
        res.status(animalsCountResponse.status).json({ message: "Nao foi possivel carregar a contagem de animais.", details: animalsCountBody });
        return;
      }

      const tutor = Array.isArray(tutorBody) ? tutorBody[0] : null;
      if (!tutor) {
        res.status(404).json({ message: "Tutor nao encontrado." });
        return;
      }

      const totalAnimalsEvaluated = typeof animalsCountBody === "number"
        ? animalsCountBody
        : Number(animalsCountBody ?? 0);
      const matches = Array.isArray(matchesBody) ? matchesBody.map(toMatchResult) : [];

      const response: MatchResponse = {
        tutor_id: tutor.id,
        tutor_name: tutor.name,
        total_animals_evaluated: totalAnimalsEvaluated,
        matches,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel calcular os matches.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };
}

function toMatchResult(rawMatch: any): MatchResult {
  return {
    animal_id: String(rawMatch.animal_id),
    animal_name: String(rawMatch.animal_name ?? ""),
    compatibility_score: Number(rawMatch.compatibility_score ?? 0),
    matched_rules: Array.isArray(rawMatch.matched_rules) ? rawMatch.matched_rules.map(String) : [],
    details: Array.isArray(rawMatch.details)
      ? rawMatch.details.map((detail: any) => ({
        rule_id: String(detail?.rule_id ?? ""),
        rule_name: String(detail?.rule_name ?? ""),
        matched: Boolean(detail?.matched),
        weight: Number(detail?.weight ?? 0),
        is_dealbreaker: detail?.is_dealbreaker === undefined ? undefined : Boolean(detail.is_dealbreaker),
      }))
      : [],
  };
}
