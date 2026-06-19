import { Request, Response } from "express";
import { z } from "zod";
import { knockoutEligibleQuestionTypes } from "../lib/onboardingEligibility";

export const animalPhotosBucket = "animal-photos";
export const maxAnimalPhotoSizeBytes = 5 * 1024 * 1024;
export const allowedAnimalPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
export const animalPhotoExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const adminTables = {
  "admin-users": {
    table: "admin_users",
    select: "id,auth_user_id,email,is_active,created_by,created_at,updated_at",
    order: "created_at.desc",
    createFields: ["auth_user_id", "email", "is_active", "created_by"],
    updateFields: ["email", "is_active"],
  },
  tutors: {
    table: "tutors",
    select: "id,auth_user_id,name,location,custom_fields,onboarding_completed_at,created_at",
    order: "created_at.desc",
    createFields: ["auth_user_id", "name", "location", "custom_fields"],
    updateFields: ["name", "location", "custom_fields"],
  },
  animals: {
    table: "animals",
    select: "id,owner_id,name,species,location,custom_fields,created_at",
    order: "created_at.desc",
    createFields: ["owner_id", "name", "species", "location", "custom_fields"],
    updateFields: ["owner_id", "name", "species", "location", "custom_fields"],
  },
  "animal-photos": {
    table: "animal_photos",
    select: "id,animal_id,bucket_id,storage_path,public_url,content_type,size_bytes,is_primary,created_at",
    order: "created_at.desc",
    createFields: ["id", "animal_id", "bucket_id", "storage_path", "public_url", "content_type", "size_bytes", "is_primary"],
    updateFields: ["animal_id", "bucket_id", "storage_path", "public_url", "content_type", "size_bytes", "is_primary"],
  },
  "tutor-interessados": {
    table: "tutor_interessados",
    select: "id:uuid_registro,uuid_registro,tutor_id,animal_id,data_registro,tutor:tutors(id,name,auth_user_id),animal:animals(id,name,species)",
    order: "data_registro.desc",
    createFields: ["tutor_id", "animal_id"],
    updateFields: [],
    idField: "uuid_registro",
  },
  "calendar-events": {
    table: "calendar_events",
    select: "id,tutor_id,animal_id,interest_id,title,description,location,starts_at,ends_at,status,provider,external_event_id,external_event_url,metadata,created_by,created_at,updated_at,tutor:tutors(id,name),animal:animals(id,name,species)",
    order: "starts_at.asc",
    createFields: ["tutor_id", "animal_id", "interest_id", "title", "description", "location", "starts_at", "ends_at", "status", "provider", "external_event_id", "external_event_url", "metadata", "created_by"],
    updateFields: ["tutor_id", "animal_id", "interest_id", "title", "description", "location", "starts_at", "ends_at", "status", "provider", "external_event_id", "external_event_url", "metadata", "updated_at"],
  },
  "custom-fields": {
    table: "custom_fields",
    select: "id,entity_type,field_key,label,field_type,options,source_question_id,is_active,sort_order,created_at,updated_at",
    order: "entity_type.asc,sort_order.asc,label.asc",
    createFields: ["entity_type", "field_key", "label", "field_type", "options", "source_question_id", "is_active", "sort_order"],
    updateFields: ["entity_type", "field_key", "label", "field_type", "options", "source_question_id", "is_active", "sort_order"],
  },
  "onboarding-questions": {
    table: "onboarding_questions",
    select: "id,label,description,placeholder,type,options,required,is_knockout,knockout_values,knockout_message,is_active,sort_order,created_at,updated_at",
    order: "sort_order.asc",
    createFields: ["id", "label", "description", "placeholder", "type", "options", "required", "is_knockout", "knockout_values", "knockout_message", "is_active", "sort_order"],
    updateFields: ["label", "description", "placeholder", "type", "options", "required", "is_knockout", "knockout_values", "knockout_message", "is_active", "sort_order", "updated_at"],
  },
  "matching-rules": {
    table: "matching_rules",
    select: "id,rule_name,tutor_field,animal_field,comparison_operator,weight,is_dealbreaker,is_active,created_at",
    order: "created_at.desc",
    createFields: ["rule_name", "tutor_field", "animal_field", "comparison_operator", "weight", "is_dealbreaker", "is_active"],
    updateFields: ["rule_name", "tutor_field", "animal_field", "comparison_operator", "weight", "is_dealbreaker", "is_active"],
  },
  "service-configs": {
    table: "service_configs",
    select: "id,service_type,provider,config,is_active,updated_at",
    order: "service_type.asc,provider.asc",
    createFields: ["id", "service_type", "provider", "config", "is_active"],
    updateFields: ["config", "is_active"],
  },
  "calendar-oauth-connections": {
    table: "calendar_oauth_connections",
    select: "id,provider,calendar_id,account_email,tenant_id,access_token,refresh_token,token_type,scope,expires_at,metadata,is_active,created_by,updated_by,created_at,updated_at",
    order: "updated_at.desc",
    createFields: ["provider", "calendar_id", "account_email", "tenant_id", "access_token", "refresh_token", "token_type", "scope", "expires_at", "metadata", "is_active", "created_by", "updated_by"],
    updateFields: ["provider", "calendar_id", "account_email", "tenant_id", "access_token", "refresh_token", "token_type", "scope", "expires_at", "metadata", "is_active", "updated_by", "updated_at"],
  },
  "ong-settings": {
    table: "ong_settings",
    select: "id,ong_name,contact_email,contact_phone,whatsapp_phone,website_url,address_line,city,state,postal_code,social_links,business_hours,adoption_message_template,settings,is_active,created_at,updated_at",
    order: "id.asc",
    createFields: ["id", "ong_name", "contact_email", "contact_phone", "whatsapp_phone", "website_url", "address_line", "city", "state", "postal_code", "social_links", "business_hours", "adoption_message_template", "settings", "is_active"],
    updateFields: ["ong_name", "contact_email", "contact_phone", "whatsapp_phone", "website_url", "address_line", "city", "state", "postal_code", "social_links", "business_hours", "adoption_message_template", "settings", "is_active", "updated_at"],
  },
} as const;

export type AdminResource = keyof typeof adminTables;
export type AdminContext = Awaited<ReturnType<typeof requireAdmin>>;

export function getSupabaseBackendConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { supabaseUrl, serviceRoleKey };
}

export function getSupabasePublicConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return { supabaseUrl, publishableKey };
}

export function pickFields(source: Record<string, unknown>, fields: readonly string[]) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) payload[field] = source[field];
    return payload;
  }, {});
}

export async function getAuthenticatedUserId(supabaseUrl: string, serviceRoleKey: string, authorization?: string) {
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ?? null;
}

export function getAuthenticatedUserIdFromTokenPayload(authorization?: string) {
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return null;

  const [, payloadSegment] = accessToken.split(".");
  if (!payloadSegment) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8")) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub.trim() ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function requireAdmin(req: Request, res: Response) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return null;
  }

  const userId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, req.header("authorization"));
  if (!userId) {
    res.status(401).json({ message: "Sessao administrativa invalida ou ausente." });
    return null;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/admin_users?select=id,auth_user_id,email,is_active&auth_user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&limit=1`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    res.status(403).json({ message: "Acesso administrativo negado." });
    return null;
  }

  const body = await response.json() as Array<{ id: string; auth_user_id: string; email: string; is_active: boolean }>;
  const admin = body[0] ?? null;
  if (!admin) {
    res.status(403).json({ message: "Acesso administrativo necessario." });
    return null;
  }

  return { supabaseUrl, serviceRoleKey, admin };
}

export async function requireAuthenticated(req: Request, res: Response) {
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

export function getBearerToken(authorization?: string) {
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export function getAdminTable(resource: string) {
  return adminTables[resource as AdminResource];
}

export function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function readJsonResponse(response: globalThis.Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function toPublicStorageUrl(supabaseUrl: string, bucket: string, storagePath: string) {
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function normalizeAnimal(rawAnimal: any) {
  const photos = Array.isArray(rawAnimal.animal_photos) ? rawAnimal.animal_photos : [];
  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  });
  const customFields = rawAnimal.custom_fields && typeof rawAnimal.custom_fields === "object" ? rawAnimal.custom_fields : {};
  const photoUrls = sortedPhotos.map((photo) => photo.public_url).filter(Boolean);
  const ageValue = customFields.age ?? customFields.idade ?? customFields.idade_meses;
  const traitsValue = customFields.traits ?? customFields.caracteristicas ?? [
    customFields.raca,
    customFields.tamanho,
    customFields.nivel_energia,
  ];

  return {
    id: rawAnimal.id,
    owner_id: rawAnimal.owner_id,
    name: rawAnimal.name,
    species: rawAnimal.species,
    custom_fields: customFields,
    created_at: rawAnimal.created_at,
    age: typeof ageValue === "number" ? ageValue : Number(ageValue) || 0,
    verified: Boolean(customFields.verified ?? customFields.verificado ?? true),
    traits: Array.isArray(traitsValue) ? traitsValue.filter(Boolean).map(String) : [],
    photoUrl: photoUrls[0] ?? "",
    photoUrls,
    photos: sortedPhotos,
  };
}

export function normalizeTutor(rawTutor: any) {
  const customFields = rawTutor.custom_fields && typeof rawTutor.custom_fields === "object" ? rawTutor.custom_fields : {};
  return {
    id: rawTutor.id,
    auth_user_id: rawTutor.auth_user_id,
    name: rawTutor.name,
    location: rawTutor.location,
    custom_fields: customFields,
    created_at: rawTutor.created_at,
  };
}

export function normalizeInterestSummary(rawInterest: any) {
  const tutor = rawInterest.tutor && typeof rawInterest.tutor === "object" ? rawInterest.tutor : {};
  const animal = rawInterest.animal && typeof rawInterest.animal === "object" ? rawInterest.animal : {};

  return {
    id: rawInterest.id ?? rawInterest.uuid_registro,
    uuid_registro: rawInterest.uuid_registro,
    tutor_id: rawInterest.tutor_id,
    animal_id: rawInterest.animal_id,
    data_registro: rawInterest.data_registro,
    tutor_name: tutor.name ?? "",
    animal_name: animal.name ?? "",
    animal_species: animal.species ?? "",
    detail_url: rawInterest.uuid_registro ? `/interessados/${rawInterest.uuid_registro}` : "",
  };
}

export function normalizeCalendarEvent(rawEvent: any) {
  const tutor = rawEvent.tutor && typeof rawEvent.tutor === "object" ? rawEvent.tutor : {};
  const animal = rawEvent.animal && typeof rawEvent.animal === "object" ? rawEvent.animal : {};

  return {
    id: rawEvent.id,
    tutor_id: rawEvent.tutor_id,
    animal_id: rawEvent.animal_id,
    interest_id: rawEvent.interest_id,
    title: rawEvent.title,
    description: rawEvent.description,
    location: rawEvent.location,
    starts_at: rawEvent.starts_at,
    ends_at: rawEvent.ends_at,
    status: rawEvent.status,
    provider: rawEvent.provider,
    external_event_id: rawEvent.external_event_id,
    external_event_url: rawEvent.external_event_url,
    metadata: rawEvent.metadata && typeof rawEvent.metadata === "object" ? rawEvent.metadata : {},
    created_by: rawEvent.created_by,
    created_at: rawEvent.created_at,
    updated_at: rawEvent.updated_at,
    tutor_name: tutor.name ?? "",
    animal_name: animal.name ?? "",
    animal_species: animal.species ?? "",
  };
}

export function buildCalendarEventPayload(source: Record<string, unknown>, adminId?: string, isUpdate = false) {
  const payload = pickFields(source, [
    "tutor_id",
    "animal_id",
    "interest_id",
    "title",
    "description",
    "location",
    "starts_at",
    "ends_at",
    "status",
    "provider",
    "external_event_id",
    "external_event_url",
    "metadata",
  ]);

  if (!isUpdate) payload.created_by = adminId;
  if (isUpdate) payload.updated_at = new Date().toISOString();

  for (const field of ["tutor_id", "animal_id", "interest_id", "description", "location", "provider", "external_event_id", "external_event_url"]) {
    if (payload[field] === "") payload[field] = null;
  }

  if (!payload.status) payload.status = "scheduled";
  if (!payload.metadata || typeof payload.metadata !== "object" || Array.isArray(payload.metadata)) payload.metadata = {};
  return payload;
}

const CalendarEventStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
const CalendarProviderSchema = z.enum(["google", "microsoft"]);
const JsonObjectSchema = z.record(z.string(), z.unknown());
const AdminIdentifierSchema = z.string().trim().min(1).regex(/^[a-z0-9_]+$/, "Use apenas letras minusculas, numeros e underscore.");
const ChoiceOptionSchema = z.object({
  label: z.string().trim().min(1, "Cada opcao precisa de um label."),
  value: z.string().trim().min(1, "Cada opcao precisa de um value."),
});
const ChoiceOptionsSchema = z.array(ChoiceOptionSchema).nullable().optional();
const ChoiceFieldTypes = new Set(["select", "multiselect", "radio"]);

const CalendarEventPayloadBaseSchema = z.object({
  tutor_id: z.string().uuid().nullable().optional(),
  animal_id: z.string().uuid().nullable().optional(),
  interest_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Informe o titulo do evento."),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  starts_at: z.string().datetime({ message: "Data de inicio invalida." }),
  ends_at: z.string().datetime({ message: "Data de fim invalida." }),
  status: CalendarEventStatusSchema.default("scheduled").optional(),
  provider: CalendarProviderSchema.nullable().optional(),
  external_event_id: z.string().nullable().optional(),
  external_event_url: z.string().nullable().optional(),
  metadata: JsonObjectSchema.nullable().optional(),
  created_by: z.string().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
});

const CalendarEventPayloadSchema = CalendarEventPayloadBaseSchema.refine((data) => new Date(data.ends_at) > new Date(data.starts_at), {
  message: "A data de fim deve ser posterior ao inicio.",
  path: ["ends_at"],
});

const CalendarEventPayloadSchemaUpdate = CalendarEventPayloadBaseSchema.partial().refine((data) => {
  if (!data.starts_at || !data.ends_at) return true;
  return new Date(data.ends_at) > new Date(data.starts_at);
}, {
  message: "A data de fim deve ser posterior ao inicio.",
  path: ["ends_at"],
}).and(z.object({
  title: z.string().min(1, "Informe o titulo do evento.").optional(),
  starts_at: z.string().datetime({ message: "Data de inicio invalida." }).optional(),
  ends_at: z.string().datetime({ message: "Data de fim invalida." }).optional(),
}));

function getZodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Payload invalido.";
}

export function validateCalendarEventPayload(payload: Record<string, unknown>, isUpdate = false) {
  try {
    if (isUpdate) {
      CalendarEventPayloadSchemaUpdate.parse(payload);
    } else {
      CalendarEventPayloadSchema.parse(payload);
    }
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return getZodMessage(error);
    }
    return "Erro de validacao desconhecido.";
  }
}

function normalizeOptionalLocation(payload: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(payload, "location")) return;
  if (typeof payload.location === "string" && payload.location.trim() === "") {
    payload.location = null;
  }
}

export async function validateResourcePayload(resource: string, payload: Record<string, unknown>, supabaseUrl: string, serviceRoleKey: string, isUpdate = false) {
  if (resource === "tutors" || resource === "animals") {
    normalizeOptionalLocation(payload);
  }

  if (resource === "custom-fields") {
    return validateCustomFieldPayload(payload, supabaseUrl, serviceRoleKey);
  }

  if (resource === "onboarding-questions") {
    return validateOnboardingQuestionPayload(payload, isUpdate);
  }

  if (resource === "ong-settings") {
    return validateOngSettingsPayload(payload);
  }

  if (resource === "matching-rules") {
    return validateMatchingRulePayload(payload, isUpdate);
  }

  if (resource === "tutors" && Object.prototype.hasOwnProperty.call(payload, "custom_fields")) {
    return validateTutorCustomFields(payload.custom_fields, supabaseUrl, serviceRoleKey);
  }

  return null;
}

const MatchingRuleComparisonOperatorSchema = z.enum(["=", "!=", ">=", "<=", "contains"]);

const MatchingRulePayloadSchema = z.object({
  rule_name: z.string().min(1, "Preencha nome, campos comparados e condicao da regra."),
  tutor_field: z.string().min(1, "Preencha nome, campos comparados e condicao da regra."),
  animal_field: z.string().min(1, "Preencha nome, campos comparados e condicao da regra."),
  comparison_operator: MatchingRuleComparisonOperatorSchema,
  weight: z.coerce.number().int().min(0, "O impacto da regra deve ficar entre 0 e 100.").max(100, "O impacto da regra deve ficar entre 0 e 100.").optional(),
  is_dealbreaker: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

function validateMatchingRulePayload(payload: Record<string, unknown>, isUpdate = false) {
  try {
    const parsed = (isUpdate ? MatchingRulePayloadSchema.partial() : MatchingRulePayloadSchema).parse(payload);
    if (Object.prototype.hasOwnProperty.call(parsed, "weight")) payload.weight = parsed.weight;
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return getZodMessage(error);
    }
    return "Erro de validacao desconhecido.";
  }
}

const OngSettingsPayloadSchema = z.object({
  ong_name: z.string().optional(),
  contact_email: z.string().email("Email de contato invalido.").nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  whatsapp_phone: z.string().nullable().optional(),
  website_url: z.string().url("URL do website invalida.").nullable().optional(),
  address_line: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  social_links: z.unknown().optional(),
  business_hours: z.unknown().optional(),
  adoption_message_template: z.string().nullable().optional(),
  settings: z.unknown().optional(),
  is_active: z.boolean().optional(),
  updated_at: z.string().datetime().optional(),
}).partial().superRefine((data, ctx) => {
  for (const field of ["social_links", "business_hours", "settings"] as const) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      const value = data[field];
      if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} deve ser um objeto JSON.`,
          path: [field],
        });
      }
    }
  }
});

function validateOngSettingsPayload(payload: Record<string, unknown>) {
  // Coerce empty strings to null before validation
  for (const field of ["contact_email", "contact_phone", "whatsapp_phone", "website_url", "address_line", "city", "state", "postal_code", "adoption_message_template"]) {
    if (payload[field] === "") payload[field] = null;
  }

  try {
    OngSettingsPayloadSchema.parse(payload);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return getZodMessage(error);
    }
    return "Erro de validacao desconhecido.";
  }
}

const CustomFieldPayloadSchema = z.object({
  entity_type: z.enum(["tutor", "animal"], { message: "Informe se o campo customizado serve para tutores ou animais." }),
  field_key: AdminIdentifierSchema,
  label: z.string().min(1),
  field_type: z.string().min(1),
  options: z.array(z.string()).nullable().optional(),
  source_question_id: AdminIdentifierSchema.nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

async function validateCustomFieldPayload(payload: Record<string, unknown>, supabaseUrl: string, serviceRoleKey: string) {
  if (payload.options === null) payload.options = undefined;
  if (payload.source_question_id === "") payload.source_question_id = null;

  try {
    const parsedPayload = CustomFieldPayloadSchema.parse(payload);
    const fieldType = String(parsedPayload.field_type).trim();

    if ((fieldType === "select" || fieldType === "multiselect") && (!parsedPayload.options || parsedPayload.options.length === 0)) {
      return "Campos do tipo lista precisam de pelo menos uma opcao.";
    }

    if (fieldType !== "select" && fieldType !== "multiselect") {
      payload.options = undefined;
    }

    if (parsedPayload.entity_type !== "tutor") {
      parsedPayload.source_question_id = null;
      payload.source_question_id = null; // Update the original payload if necessary
    }

    if (parsedPayload.entity_type === "tutor") {
      const sourceQuestionId = typeof parsedPayload.source_question_id === "string" ? parsedPayload.source_question_id.trim() : "";
      if (!sourceQuestionId) {
        return "Campos customizados de tutor precisam estar vinculados a uma pergunta de onboarding.";
      }

      const questionIds = await fetchActiveOnboardingQuestionIds(supabaseUrl, serviceRoleKey);
      if (!questionIds.has(sourceQuestionId)) {
        return "A pergunta vinculada ao campo customizado de tutor nao existe ou esta inativa.";
      }
      parsedPayload.source_question_id = sourceQuestionId;
      payload.source_question_id = sourceQuestionId; // Update the original payload if necessary
    }

    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return getZodMessage(error);
    }
    return "Erro de validacao desconhecido.";
  }
}

const OnboardingQuestionPayloadSchema = z.object({
  id: AdminIdentifierSchema,
  label: z.string().trim().min(1, "Informe o texto da pergunta."),
  description: z.string().nullable().optional(),
  placeholder: z.string().nullable().optional(),
  type: z.enum(["text", "number", "select", "multiselect", "radio", "boolean"], { message: "Tipo de pergunta invalido." }),
  options: ChoiceOptionsSchema,
  required: z.boolean().optional(),
  is_knockout: z.boolean().optional(),
  knockout_values: z.array(z.string().trim().min(1, "Cada valor eliminatorio precisa estar preenchido.")).nullable().optional(),
  knockout_message: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

function validateOnboardingQuestionPayload(payload: Record<string, unknown>, isUpdate = false) {
  for (const field of ["description", "placeholder", "knockout_message"] as const) {
    if (payload[field] === "") payload[field] = null;
  }
  if (payload.options === null) payload.options = undefined;
  if (payload.knockout_values === null) payload.knockout_values = undefined;

  try {
    const parsedPayload = (isUpdate ? OnboardingQuestionPayloadSchema.partial() : OnboardingQuestionPayloadSchema).parse(payload);
    const questionType = typeof parsedPayload.type === "string" ? parsedPayload.type : undefined;
    const hasChoiceOptions = Array.isArray(parsedPayload.options) && parsedPayload.options.length > 0;
    const knockoutValues = Array.isArray(parsedPayload.knockout_values)
      ? parsedPayload.knockout_values.map((value) => value.trim()).filter(Boolean)
      : [];

    if (questionType && ChoiceFieldTypes.has(questionType) && !hasChoiceOptions) {
      return "Perguntas de escolha precisam de pelo menos uma opcao.";
    }

    if (questionType && !ChoiceFieldTypes.has(questionType)) {
      payload.options = undefined;
    }

    if (parsedPayload.is_knockout === true) {
      if (!questionType || !knockoutEligibleQuestionTypes.has(questionType)) {
        return "Perguntas eliminatorias precisam ser do tipo select, multiselect, radio ou boolean.";
      }

      if (knockoutValues.length === 0) {
        return "Informe pelo menos um valor eliminatorio para a pergunta.";
      }

      const allowedValues = questionType === "boolean"
        ? ["true", "false"]
        : (parsedPayload.options ?? []).map((option) => option.value);
      const invalidKnockoutValues = knockoutValues.filter((value) => !allowedValues.includes(value));

      if (invalidKnockoutValues.length > 0) {
        return "Os valores eliminatorios precisam existir entre as opcoes da pergunta.";
      }

      payload.knockout_values = knockoutValues;
    } else {
      payload.knockout_values = undefined;
      payload.knockout_message = null;
    }

    if (parsedPayload.id) payload.id = parsedPayload.id;
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return getZodMessage(error);
    }
    return "Erro de validacao desconhecido.";
  }
}

export async function validateTutorCustomFields(customFields: unknown, supabaseUrl: string, serviceRoleKey: string) {
  const CustomFieldsSchema = JsonObjectSchema;

  try {
    CustomFieldsSchema.parse(customFields);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return getZodMessage(error);
    }
    return "Campos customizados do tutor devem ser um objeto.";
  }

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
    fetch(`${supabaseUrl}/rest/v1/custom_fields?select=field_key,source_question_id&entity_type=eq.tutor&is_active=eq.true`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    }),
  ]);
  const customFields = await customFieldsResponse.json() as Array<{ field_key?: string; source_question_id?: string | null }>;
  const allowedKeys = new Set<string>(["onboarding_complete", ...questions]);

  for (const field of customFields) {
    if (field.field_key && (!field.source_question_id || questions.has(field.source_question_id))) {
      allowedKeys.add(field.field_key);
    }
  }

  return allowedKeys;
}
