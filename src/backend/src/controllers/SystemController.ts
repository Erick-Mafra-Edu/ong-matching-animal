import { Request, Response } from "express";
import type { MatchResponse } from "@ong-matching-animal/shared/types";
import { getSupabaseBackendConfig } from "./apiSupport";

export class SystemController {
  getHealth = (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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

  match = (req: Request, res: Response) => {
    const { tutor_id } = req.body;
    const response: MatchResponse = {
      tutor_id,
      tutor_name: "Placeholder",
      total_animals_evaluated: 0,
      matches: [],
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  };
}
