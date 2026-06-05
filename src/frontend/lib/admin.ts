import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { backendApiUrl } from "@/lib/backend";

export type AdminResource =
  | "admin-users"
  | "tutors"
  | "animals"
  | "animal-photos"
  | "tutor-interessados"
  | "calendar-events"
  | "custom-fields"
  | "onboarding-questions"
  | "matching-rules"
  | "service-configs";

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
    label: "Calendario",
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
      weight: 10,
      is_active: true,
    },
  },
];

async function getAccessToken() {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) throw error ?? new Error("Sessao ausente.");
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
    throw new Error(message);
  }

  return body as T;
}

export function getAdminMe() {
  return adminFetch<Record<string, unknown>>("/api/admin/me");
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
      : "Nao foi possivel registrar a foto.";
    throw new Error(message);
  }

  return responseBody as Record<string, unknown>;
}
