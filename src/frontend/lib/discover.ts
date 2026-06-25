import { backendApiUrl } from "@/lib/backend";
import { fetchAnimalFallbackPhoto } from "@/lib/animalFallbackPhoto";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AnimalListItem } from "@/types/adoption";

export interface AnimalsPageResponse {
  items: AnimalListItem[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
}

export const DISCOVER_ANIMALS_PAGE_SIZE = 2;
export const IMAGE_PRELOAD_WINDOW = 2;

interface FetchAnimalsPageOptions {
  tutorId?: string | null;
  accessToken?: string;
  baseUrl?: string;
  init?: RequestInit;
}

interface ApiErrorResponse {
  message?: string;
}

async function withFallbackPhoto(animal: AnimalListItem): Promise<AnimalListItem> {
  if (animal.photoUrl || animal.photoUrls?.length) return animal;

  const photoUrl = await fetchAnimalFallbackPhoto();
  return { ...animal, photoUrl, photoUrls: [photoUrl] };
}

export function getPrimaryPhotoUrl(animal: AnimalListItem) {
  return animal.photoUrl || animal.photoUrls?.[0] || "";
}

function preloadImage(url: string) {
  if (typeof window === "undefined" || !url) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
}

export async function preloadPrimaryAnimalPhotos(animals: AnimalListItem[]) {
  await Promise.all(animals.slice(0, IMAGE_PRELOAD_WINDOW).map((animal) => preloadImage(getPrimaryPhotoUrl(animal))));
}

export async function fetchAnimalsPage(offset: number, optionsOrTutorId?: string | null | FetchAnimalsPageOptions): Promise<AnimalsPageResponse> {
  const options = normalizeFetchOptions(optionsOrTutorId);
  const params = new URLSearchParams({
    limit: String(DISCOVER_ANIMALS_PAGE_SIZE),
    offset: String(offset),
  });
  const headers = new Headers(options.init?.headers);

  if (options.tutorId) {
    params.set("tutor_id", options.tutorId);
    const accessToken = await resolveAccessToken(options);
    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(
    buildAnimalsUrl(params.toString(), options.baseUrl),
    {
      ...options.init,
      headers,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiErrorResponse | null;
    throw new Error(body?.message ?? "Nao foi possivel carregar os animais.");
  }

  const body = await response.json() as AnimalsPageResponse | AnimalListItem[];
  if (Array.isArray(body)) {
    const items = await Promise.all(body.map(withFallbackPhoto));
    await preloadPrimaryAnimalPhotos(items);
    return {
      items,
      pagination: {
        limit: items.length,
        offset,
        nextOffset: null,
        hasMore: false,
      },
    };
  }

  const pageItems = Array.isArray(body.items) ? body.items : [];
  const items = await Promise.all(pageItems.map(withFallbackPhoto));
  await preloadPrimaryAnimalPhotos(items);
  return {
    items,
    pagination: body.pagination ?? {
      limit: items.length,
      offset,
      nextOffset: null,
      hasMore: false,
    },
  };
}

function normalizeFetchOptions(optionsOrTutorId?: string | null | FetchAnimalsPageOptions): FetchAnimalsPageOptions {
  if (!optionsOrTutorId || typeof optionsOrTutorId === "string") {
    return { tutorId: optionsOrTutorId ?? null };
  }

  return optionsOrTutorId;
}

export function isNoAnimalsAvailableMessage(message: string | null | undefined) {
  if (!message) return false;

  const normalizedMessage = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return [
    "nenhum animal",
    "nao ha animal",
    "nao existem animais",
    "nao foi encontrado animal",
    "sem animais",
    "animal cadastrado",
    "compativel com o perfil",
  ].some((fragment) => normalizedMessage.includes(fragment));
}

async function resolveAccessToken(options: FetchAnimalsPageOptions) {
  if (options.accessToken) return options.accessToken;
  if (typeof window === "undefined") return null;

  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session?.access_token) {
    throw error ?? new Error("Sessao ausente para carregar os matches.");
  }

  return data.session.access_token;
}

function buildAnimalsUrl(queryString: string, baseUrl?: string) {
  const relativeUrl = backendApiUrl(`/api/animals?${queryString}`);
  if (!baseUrl || /^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  return `${baseUrl}${relativeUrl}`;
}
