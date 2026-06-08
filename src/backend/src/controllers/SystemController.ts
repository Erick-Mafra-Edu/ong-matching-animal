import { Request, Response } from "express";
import type { AnimalProfile, MatchResponse, MatchingRule, TutorProfile } from "@ong-matching-animal/shared/types";
import { MatchingAlgorithm } from "../lib/matching";
import { getSupabaseBackendConfig } from "./apiSupport";

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
    const { tutor_id, limit = 10 } = req.body as { tutor_id?: string; limit?: number };
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
      const [tutorResponse, animalsResponse, rulesResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/tutors?select=id,auth_user_id,name,location,custom_fields,created_at&id=eq.${encodeURIComponent(tutor_id)}&limit=1`, {
          headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
        }),
        fetch(`${supabaseUrl}/rest/v1/animals?select=id,owner_id,name,species,location,custom_fields,created_at&order=created_at.desc`, {
          headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
        }),
        fetch(`${supabaseUrl}/rest/v1/matching_rules?select=id,rule_name,tutor_field,animal_field,comparison_operator,weight,is_dealbreaker,is_active,created_at&is_active=eq.true`, {
          headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
        }),
      ]);

      const tutorBody = await tutorResponse.json();
      const animalsBody = await animalsResponse.json();
      const rulesBody = await rulesResponse.json();

      if (!tutorResponse.ok) {
        res.status(tutorResponse.status).json({ message: "Nao foi possivel carregar o tutor.", details: tutorBody });
        return;
      }
      if (!animalsResponse.ok) {
        res.status(animalsResponse.status).json({ message: "Nao foi possivel carregar os animais.", details: animalsBody });
        return;
      }
      if (!rulesResponse.ok) {
        res.status(rulesResponse.status).json({ message: "Nao foi possivel carregar as regras de matching.", details: rulesBody });
        return;
      }

      const tutor = Array.isArray(tutorBody) ? tutorBody[0] : null;
      if (!tutor) {
        res.status(404).json({ message: "Tutor nao encontrado." });
        return;
      }

      const animals = Array.isArray(animalsBody) ? animalsBody.map(toAnimalProfile) : [];
      const rules = Array.isArray(rulesBody) ? rulesBody as MatchingRule[] : [];
      const algorithm = new MatchingAlgorithm();
      const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 50) : 10;

      const response: MatchResponse = {
        tutor_id: tutor.id,
        tutor_name: tutor.name,
        total_animals_evaluated: animals.length,
        matches: algorithm.findBestMatches(toTutorProfile(tutor), animals, rules, safeLimit),
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

function toTutorProfile(rawTutor: any): TutorProfile {
  return {
    id: rawTutor.id,
    auth_user_id: rawTutor.auth_user_id,
    name: rawTutor.name,
    location: normalizeLocation(rawTutor.location),
    custom_fields: rawTutor.custom_fields && typeof rawTutor.custom_fields === "object" ? rawTutor.custom_fields : {},
    created_at: rawTutor.created_at,
  };
}

function toAnimalProfile(rawAnimal: any): AnimalProfile {
  return {
    id: rawAnimal.id,
    owner_id: rawAnimal.owner_id,
    name: rawAnimal.name,
    species: rawAnimal.species,
    location: normalizeLocation(rawAnimal.location),
    custom_fields: rawAnimal.custom_fields && typeof rawAnimal.custom_fields === "object" ? rawAnimal.custom_fields : {},
    created_at: rawAnimal.created_at,
  };
}

function normalizeLocation(_value: unknown) {
  return { lat: 0, lng: 0 };
}
