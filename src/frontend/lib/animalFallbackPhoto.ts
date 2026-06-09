export const dogFallbackImageApiUrl = "https://dog.ceo/api/breeds/image/random";

const staticDogFallbackImageUrl = "https://images.dog.ceo/breeds/retriever-golden/n02099601_3004.jpg";

interface DogFallbackResponse {
  message?: string;
  status?: string;
}

export async function fetchAnimalFallbackPhoto() {
  try {
    const response = await fetch(dogFallbackImageApiUrl);
    if (!response.ok) return staticDogFallbackImageUrl;

    const body = await response.json() as DogFallbackResponse;
    return typeof body.message === "string" && body.message ? body.message : staticDogFallbackImageUrl;
  } catch {
    return staticDogFallbackImageUrl;
  }
}
