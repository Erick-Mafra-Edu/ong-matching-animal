import { backendApiUrl } from "@/lib/backend";

export interface OngSettings {
  id: string;
  ong_name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  whatsapp_phone?: string | null;
  website_url?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  social_links: Record<string, unknown>;
  business_hours: Record<string, unknown>;
  adoption_message_template?: string | null;
  settings: Record<string, unknown>;
}

export const defaultAdoptionMessageTemplate = "Estou com interesse de adotar {nomeDoAnimal}. O link do interesse e {linkInteresse}.\n\nObservacoes:";

export async function carregarOngSettings() {
  const response = await fetch(backendApiUrl("/api/ong-settings"), { cache: "no-store" });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? String(body.message)
      : "Nao foi possivel carregar as configuracoes da ONG.";
    throw new Error(message);
  }

  return body as OngSettings | null;
}

export function buildAdoptionMessage(template: string | null | undefined, animalName: string, interestLink: string) {
  const source = template?.trim() || defaultAdoptionMessageTemplate;
  return source
    .split("{nomeDoAnimal}").join(animalName)
    .split("{linkInteresse}").join(interestLink);
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const normalizedPhone = phone?.replace(/\D/g, "") ?? "";
  if (!normalizedPhone) return "";
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
