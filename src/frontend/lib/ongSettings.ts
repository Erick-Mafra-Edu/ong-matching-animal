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
  extension_college?: string | null;
  settings: Record<string, unknown>;
}

export const defaultAdoptionMessageTemplate = "Estou com interesse de adotar {nomeDoAnimal}. O link do interesse é {linkInteresse}.\n\nObservações:";

export async function carregarOngSettings() {
  const response = await fetch(backendApiUrl("/api/ong-settings"), { cache: "no-store" });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    return null;
  }

  return normalizeOngSettings(body);
}

function normalizeOngSettings(body: unknown): OngSettings | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const settings = body as Partial<OngSettings>;
  return {
    id: String(settings.id ?? "default"),
    ong_name: String(settings.ong_name ?? "").trim(),
    contact_email: normalizeOptionalString(settings.contact_email),
    contact_phone: normalizeOptionalString(settings.contact_phone),
    whatsapp_phone: normalizeOptionalString(settings.whatsapp_phone),
    website_url: normalizeOptionalString(settings.website_url),
    address_line: normalizeOptionalString(settings.address_line),
    city: normalizeOptionalString(settings.city),
    state: normalizeOptionalString(settings.state),
    postal_code: normalizeOptionalString(settings.postal_code),
    social_links: isRecord(settings.social_links) ? settings.social_links : {},
    business_hours: isRecord(settings.business_hours) ? settings.business_hours : {},
    adoption_message_template: normalizeOptionalString(settings.adoption_message_template),
    extension_college: normalizeOptionalString(settings.extension_college),
    settings: isRecord(settings.settings) ? settings.settings : {},
  };
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
