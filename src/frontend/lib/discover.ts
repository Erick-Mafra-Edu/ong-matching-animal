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

async function withFallbackPhoto(animal: AnimalListItem): Promise<AnimalListItem> {
  if (animal.photoUrl || animal.photoUrls?.length) return animal;

  const photoUrl = await fetchAnimalFallbackPhoto();
  return { ...animal, photoUrl, photoUrls: [photoUrl] };
}

function getPrimaryPhotoUrl(animal: AnimalListItem) {
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

export async function fetchAnimalsPage(offset: number, tutorId?: string | null): Promise<AnimalsPageResponse> {
  const params = new URLSearchParams({
    limit: String(DISCOVER_ANIMALS_PAGE_SIZE),
    offset: String(offset),
  });
  const headers: HeadersInit = {};

  if (tutorId) {
    params.set("tutor_id", tutorId);
    const { data, error } = await getSupabaseBrowserClient().auth.getSession();
    if (error || !data.session?.access_token) {
      throw error ?? new Error("Sessao ausente para carregar os matches.");
    }
    headers.authorization = `Bearer ${data.session.access_token}`;
  }

  const response = await fetch(backendApiUrl(`/api/animals?${params.toString()}`), { headers });

  if (!response.ok) throw new Error("Nao foi possivel carregar os animais.");

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
