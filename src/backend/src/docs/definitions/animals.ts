export const animalDefinitions = {
  AnimalPhoto: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      animal_id: { type: "string", format: "uuid" },
      bucket_id: { type: "string" },
      storage_path: { type: "string" },
      public_url: { type: "string", format: "uri" },
      content_type: { type: "string", enum: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
      size_bytes: { type: "number" },
      is_primary: { type: "boolean" },
      created_at: { type: "string", format: "date-time" },
    },
    required: ["id", "animal_id", "bucket_id", "storage_path", "public_url", "content_type", "size_bytes", "is_primary"],
  },
  Animal: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      owner_id: { type: "string", format: "uuid" },
      name: { type: "string" },
      species: { type: "string" },
      custom_fields: { type: "object", additionalProperties: true },
      age: { type: "number" },
      verified: { type: "boolean" },
      traits: { type: "array", items: { type: "string" } },
      photoUrl: { type: "string" },
      photoUrls: { type: "array", items: { type: "string" } },
      photos: { type: "array", items: { $ref: "#/definitions/AnimalPhoto" } },
      created_at: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "species", "photoUrl", "photoUrls", "photos"],
  },
  AnimalPage: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/definitions/Animal" },
      },
      pagination: {
        type: "object",
        properties: {
          limit: { type: "number" },
          offset: { type: "number" },
          nextOffset: { type: "number" },
          hasMore: { type: "boolean" },
        },
        required: ["limit", "offset", "hasMore"],
      },
    },
    required: ["items", "pagination"],
  },
};
