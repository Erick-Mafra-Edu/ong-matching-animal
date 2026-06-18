import { backendApiUrl } from "@/lib/backend";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface InteresseRegistro {
  uuid_registro: string;
  tutor_id: string;
  animal_id: string;
  data_registro: string;
  detail_url: string;
}

export interface InteresseAgenda {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
  external_event_url?: string | null;
}

export interface InteresseComAnimal extends InteresseRegistro {
  animal?: {
    id?: string;
    name?: string;
    species?: string;
    photoUrl?: string;
    photoUrls?: string[];
    traits?: string[];
  };
  schedule: InteresseAgenda[];
  has_schedule: boolean;
}

async function getAccessToken() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) throw error ?? new Error("Sessão ausente.");
  return data.session.access_token;
}

export async function registrarInteresse(animalId: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(backendApiUrl("/api/interessados"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ animal_id: animalId }),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? String(body.message)
      : "Não foi possível registrar o interesse.";
    throw new Error(message);
  }

  return body as InteresseRegistro;
}

export async function carregarInteresse(uuidRegistro: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(backendApiUrl(`/api/interessados/${encodeURIComponent(uuidRegistro)}`), {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? String(body.message)
      : "Não foi possível carregar o registro de interesse.";
    throw new Error(message);
  }

  return body as Record<string, unknown>;
}

export async function listarMeusInteresses() {
  const accessToken = await getAccessToken();
  const response = await fetch(backendApiUrl("/api/interessados"), {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? String(body.message)
      : "Não foi possível carregar seus interesses.";
    throw new Error(message);
  }

  return body as InteresseComAnimal[];
}
