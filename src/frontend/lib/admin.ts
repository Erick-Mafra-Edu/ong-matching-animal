import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { backendApiUrl } from "@/lib/backend";

type E2EWindow = Window & {
  __E2E_ACCESS_TOKEN__?: unknown;
};

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

export type AdminResource =
  | "admin-users"
  | "tutors"
  | "animals"
  | "animal-photos"
  | "tutor-interessados"
  | "calendar-events"
  | "calendar-oauth-connections"
  | "custom-fields"
  | "onboarding-questions"
  | "matching-rules"
  | "service-configs"
  | "ong-settings";

export interface AdminResourceConfig {
  id: AdminResource;
  label: string;
  createTemplate: Record<string, unknown>;
}

export interface NewAdminUserInput {
  email: string;
  password: string;
  full_name?: string;
  is_active: boolean;
}

export interface AdminBootstrapPayload {
  admin: Record<string, unknown>;
  custom_fields: Record<string, unknown>[];
  onboarding_questions: Record<string, unknown>[];
  resource: AdminResource;
  rows: Record<string, unknown>[];
}

export const adminResources: AdminResourceConfig[] = [
  {
    id: "admin-users",
    label: "Administradores",
    createTemplate: {},
  },
  {
    id: "tutors",
    label: "Tutores",
    createTemplate: { auth_user_id: "", name: "", custom_fields: {} },
  },
  {
    id: "animals",
    label: "Animais",
    createTemplate: { owner_id: "", name: "", species: "", custom_fields: {} },
  },
  {
    id: "animal-photos",
    label: "Fotos",
    createTemplate: {
      animal_id: "",
      bucket_id: "animal-photos",
      storage_path: "",
      public_url: "",
      content_type: "image/webp",
      size_bytes: 1,
      is_primary: false,
    },
  },
  {
    id: "tutor-interessados",
    label: "Interessados",
    createTemplate: {
      tutor_id: "",
      animal_id: "",
    },
  },
  {
    id: "calendar-events",
    label: "Calendário",
    createTemplate: {
      tutor_id: "",
      animal_id: "",
      interest_id: "",
      title: "",
      description: "",
      location: "",
      starts_at: "",
      ends_at: "",
      status: "scheduled",
      provider: null,
      external_event_id: "",
      external_event_url: "",
      metadata: {},
    },
  },
  {
    id: "calendar-oauth-connections",
    label: "Conexões OAuth",
    createTemplate: {
      provider: "google",
      calendar_id: "primary",
      account_email: "",
      tenant_id: "",
      access_token: "",
      refresh_token: "",
      token_type: "Bearer",
      scope: "",
      expires_at: "",
      metadata: {},
      is_active: true,
    },
  },
  {
    id: "service-configs",
    label: "Servicos Externos",
    createTemplate: {
      id: "",
      service_type: "calendar",
      provider: "google",
      config: {},
      is_active: true,
    },
  },
  {
    id: "ong-settings",
    label: "Configurações da ONG",
    createTemplate: {
      id: "default",
      ong_name: "ONG Matching Animal",
      contact_email: "",
      contact_phone: "",
      whatsapp_phone: "",
      website_url: "",
      address_line: "",
      city: "",
      state: "",
      postal_code: "",
      social_links: {},
      business_hours: {},
      adoption_message_template: "Estou com interesse de adotar {nomeDoAnimal}. O link do interesse é {linkInteresse}.\n\nObservações:",
      settings: {},
      is_active: true,
    },
  },
  {
    id: "custom-fields",
    label: "Campos customizados",
    createTemplate: {
      entity_type: "tutor",
      field_key: "",
      label: "",
      field_type: "text",
      options: null,
      is_active: true,
      sort_order: 0,
    },
  },
  {
    id: "onboarding-questions",
    label: "Onboarding",
    createTemplate: {
      id: "",
      label: "",
      description: "",
      placeholder: "",
      type: "text",
      options: null,
      required: true,
      is_active: true,
      sort_order: 0,
    },
  },
  {
    id: "matching-rules",
    label: "Regras",
    createTemplate: {
      rule_name: "",
      tutor_field: "",
      animal_field: "",
      comparison_operator: "=",
      weight: 50,
      is_dealbreaker: false,
      is_active: true,
    },
  },
];

async function getAccessToken() {
  if (typeof window !== "undefined") {
    const e2eAccessToken = (window as E2EWindow).__E2E_ACCESS_TOKEN__;
    if (typeof e2eAccessToken === "string" && e2eAccessToken.trim()) {
      return e2eAccessToken;
    }
  }

  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) throw error ?? new Error("Sessão ausente.");
  return data.session.access_token;
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(backendApiUrl(path), {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body ? String(body.message) : "Falha administrativa.";
    throw new AdminApiError(message, response.status);
  }

  return body as T;
}

export function getAdminMe() {
  return adminFetch<Record<string, unknown>>("/api/admin/me");
}

export function getAdminBootstrap(resource: AdminResource) {
  return adminFetch<AdminBootstrapPayload>(`/api/admin/bootstrap?resource=${encodeURIComponent(resource)}`);
}

export function listAdminResource(resource: AdminResource, q?: string) {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return adminFetch<Record<string, unknown>[]>(`/api/admin/${resource}${query}`);
}

export function createAdminResource(resource: AdminResource, payload: Record<string, unknown>) {
  return adminFetch<Record<string, unknown>>(`/api/admin/${resource}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminResource(resource: AdminResource, id: string, payload: Record<string, unknown>) {
  return adminFetch<Record<string, unknown>>(`/api/admin/${resource}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminResource(resource: AdminResource, id: string) {
  return adminFetch<{ deleted: boolean }>(`/api/admin/${resource}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function createAdminUser(payload: NewAdminUserInput) {
  return adminFetch<Record<string, unknown>>("/api/admin/admin-users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CalendarOAuthProvider = "google" | "microsoft";

export async function getCalendarOAuthAuthorizationUrl(provider: CalendarOAuthProvider) {
  const response = await adminFetch<{ authorizationUrl: string }>(`/api/oauth/${encodeURIComponent(provider)}/start`);
  return response.authorizationUrl;
}

export function refreshCalendarOAuthConnection(provider: CalendarOAuthProvider) {
  return adminFetch<{ refreshed: boolean }>(`/api/oauth/${encodeURIComponent(provider)}/refresh`, {
    method: "POST",
  });
}

export function disconnectCalendarOAuthConnection(provider: CalendarOAuthProvider) {
  return adminFetch<{ disconnected: boolean }>(`/api/oauth/${encodeURIComponent(provider)}/disconnect`, {
    method: "POST",
  });
}

export function getCalendarOAuthConnectionStatus(provider: CalendarOAuthProvider) {
  return adminFetch<{ connected: boolean; connection: Record<string, unknown> | null }>(`/api/oauth/${encodeURIComponent(provider)}/status`);
}

export async function uploadAnimalPhoto(
  animalId: string,
  file: File,
  onProgress?: (percent: number) => void
) {
  const accessToken = await getAccessToken();

  // 1. Solicita URL assinada para o backend
  const signedUrlResponse = await fetch(backendApiUrl(`/api/animals/${encodeURIComponent(animalId)}/photos/signed-url`), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contentType: file.type,
      fileName: file.name,
    }),
  });

  if (!signedUrlResponse.ok) {
    const errorBody = await signedUrlResponse.json().catch(() => ({ message: "Erro ao gerar URL de upload." }));
    throw new Error(errorBody.message || "Erro ao gerar URL de upload.");
  }

  const { uploadUrl, photoId, storagePath, publicUrl } = await signedUrlResponse.json() as {
    uploadUrl: string;
    photoId: string;
    storagePath: string;
    publicUrl: string;
  };

  // 2. Realiza o upload direto para o Supabase Storage com progresso
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Falha ao enviar arquivo para o storage do Supabase."));
      }
    };

    xhr.onerror = () => reject(new Error("Erro de rede ao enviar arquivo."));
    xhr.send(file);
  });

  // 3. Registra a conclusao do upload e metadados no backend
  const response = await fetch(backendApiUrl(`/api/animals/${encodeURIComponent(animalId)}/photos`), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: photoId,
      storage_path: storagePath,
      public_url: publicUrl,
      content_type: file.type,
      size_bytes: file.size,
    }),
  });
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const message = responseBody && typeof responseBody === "object" && "message" in responseBody
      ? String(responseBody.message)
      : "Não foi possível registrar a foto.";
    throw new Error(message);
  }

  return responseBody as Record<string, unknown>;
}
