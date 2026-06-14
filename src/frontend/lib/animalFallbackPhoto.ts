export const dogFallbackImageApiUrl = "https://dog.ceo/api/breeds/image/random";

const staticDogFallbackImageUrl = "https://images.dog.ceo/breeds/retriever-golden/n02099601_3004.jpg";

export async function fetchAnimalFallbackPhoto() {
  return staticDogFallbackImageUrl;
}
