import { Request, Response } from "express";

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
    select: "id,auth_user_id,name,location,custom_fields,created_at",
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
    createFields: ["animal_id", "bucket_id", "storage_path", "public_url", "content_type", "size_bytes", "is_primary"],
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
    select: "id,entity_type,field_key,label,field_type,options,is_active,sort_order,created_at,updated_at",
    order: "entity_type.asc,sort_order.asc,label.asc",
    createFields: ["entity_type", "field_key", "label", "field_type", "options", "is_active", "sort_order"],
    updateFields: ["entity_type", "field_key", "label", "field_type", "options", "is_active", "sort_order"],
  },
  "onboarding-questions": {
    table: "onboarding_questions",
    select: "id,label,description,placeholder,type,options,required,is_active,sort_order,created_at",
    order: "sort_order.asc",
    createFields: ["id", "label", "description", "placeholder", "type", "options", "required", "is_active", "sort_order"],
    updateFields: ["label", "description", "placeholder", "type", "options", "required", "is_active", "sort_order"],
  },
  "matching-rules": {
    table: "matching_rules",
    select: "id,rule_name,tutor_field,animal_field,comparison_operator,weight,is_active,created_at",
    order: "created_at.desc",
    createFields: ["rule_name", "tutor_field", "animal_field", "comparison_operator", "weight", "is_active"],
    updateFields: ["rule_name", "tutor_field", "animal_field", "comparison_operator", "weight", "is_active"],
  },
  "service-configs": {
    table: "service_configs",
    select: "id,service_type,provider,config,is_active,updated_at",
    order: "service_type.asc,provider.asc",
    createFields: ["id", "service_type", "provider", "config", "is_active"],
    updateFields: ["config", "is_active"],
  },
} as const;

export type AdminResource = keyof typeof adminTables;
export type AdminContext = Awaited<ReturnType<typeof requireAdmin>>;

export function getSupabaseBackendConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { supabaseUrl, serviceRoleKey };
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

export function getAdminTable(resource: string) {
  return adminTables[resource as AdminResource];
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

export function validateCalendarEventPayload(payload: Record<string, unknown>, isUpdate = false) {
  if (!isUpdate && !payload.title) return "Informe o titulo do evento.";
  if (!isUpdate && !payload.starts_at) return "Informe a data de inicio do evento.";
  if (!isUpdate && !payload.ends_at) return "Informe a data de fim do evento.";

  const startsAt = payload.starts_at ? new Date(String(payload.starts_at)) : null;
  const endsAt = payload.ends_at ? new Date(String(payload.ends_at)) : null;

  if (startsAt && Number.isNaN(startsAt.getTime())) return "Data de inicio invalida.";
  if (endsAt && Number.isNaN(endsAt.getTime())) return "Data de fim invalida.";
  if (startsAt && endsAt && endsAt <= startsAt) return "A data de fim deve ser posterior ao inicio.";
  if (payload.status && !["scheduled", "completed", "cancelled"].includes(String(payload.status))) return "Status de evento invalido.";
  if (payload.provider && !["google", "microsoft"].includes(String(payload.provider))) return "Provider de calendario invalido.";
  return null;
}
