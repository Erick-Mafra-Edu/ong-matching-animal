import type { AnimalListItem } from "@/types/adoption";
import { backendApiUrl } from "@/lib/backend";

export interface AnimalsPageResponse {
  items: AnimalListItem[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
}

const staticDogFallbackImageUrl = "https://images.dog.ceo/breeds/retriever-golden/n02099601_3004.jpg";

export const DISCOVER_ANIMALS_PAGE_SIZE = 2;
export const IMAGE_PRELOAD_WINDOW = 2;

function withFallbackPhoto(animal: AnimalListItem): AnimalListItem {
  if (animal.photoUrl || animal.photoUrls?.length) return animal;
  return { ...animal, photoUrl: staticDogFallbackImageUrl, photoUrls: [staticDogFallbackImageUrl] };
}

export function getPrimaryPhotoUrl(animal: AnimalListItem) {
  return animal.photoUrl || animal.photoUrls?.[0] || "";
}

export async function preloadPrimaryAnimalPhotos(animals: AnimalListItem[]) {
  if (typeof window === "undefined") return;

  await Promise.all(
    animals.slice(0, IMAGE_PRELOAD_WINDOW).map((animal) => {
      const url = getPrimaryPhotoUrl(animal);
      if (!url) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = url;
      });
    }),
  );
}

interface FetchAnimalsPageOptions {
  baseUrl?: string;
  init?: RequestInit;
}

export async function fetchAnimalsPage(
  offset: number,
  options?: FetchAnimalsPageOptions,
): Promise<AnimalsPageResponse> {
  const params = new URLSearchParams({
    limit: String(DISCOVER_ANIMALS_PAGE_SIZE),
    offset: String(offset),
  });
  const basePath = backendApiUrl(`/api/animals?${params.toString()}`);
  const url = options?.baseUrl && basePath.startsWith("/") ? `${options.baseUrl}${basePath}` : basePath;
  const response = await fetch(url, options?.init);

  if (!response.ok) throw new Error("Nao foi possivel carregar os animais.");

  const body = await response.json() as AnimalsPageResponse | AnimalListItem[];
  if (Array.isArray(body)) {
    const items = body.map(withFallbackPhoto);
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

  return {
    items: (Array.isArray(body.items) ? body.items : []).map(withFallbackPhoto),
    pagination: body.pagination ?? {
      limit: 0,
      offset,
      nextOffset: null,
      hasMore: false,
    },
  };
}
