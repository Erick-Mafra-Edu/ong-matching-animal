export const animalPaths = {
  "/animals": {
    get: {
      tags: ["Animals"],
      operationId: "listAnimals",
      summary: "Lista animais com URLs publicas das fotos em paginas.",
      parameters: [
        { in: "query", name: "limit", required: false, type: "number", description: "Quantidade de itens por pagina. Maximo 50." },
        { in: "query", name: "offset", required: false, type: "number", description: "Indice inicial da pagina." },
        { in: "query", name: "tutor_id", required: false, type: "string", format: "uuid", description: "Quando enviado, retorna matches em cache do tutor autenticado." },
      ],
      responses: {
        200: {
          description: "Pagina de animais ordenados por criacao.",
          schema: { $ref: "#/definitions/AnimalPage" },
        },
        401: { description: "Sessao invalida ou ausente para consultar matches de tutor.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Nao e permitido listar matches de outro tutor.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro de configuração ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
    post: {
      tags: ["Animals"],
      operationId: "createAnimal",
      summary: "Placeholder para criação de animal.",
      responses: { 201: { description: "Animal criado." } },
    },
  },
  "/animals/{id}/photos/signed-url": {
    post: {
      tags: ["Animals"],
      operationId: "getAnimalPhotoSignedUrl",
      summary: "Gera uma URL assinada para upload direto ao Supabase Storage.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, type: "string", format: "uuid" },
        {
          in: "body",
          name: "body",
          required: true,
          schema: {
            type: "object",
            properties: {
              contentType: { type: "string" },
              fileName: { type: "string" },
            },
            required: ["contentType"],
          },
        },
      ],
      responses: {
        200: {
          description: "URL assinada gerada.",
          schema: {
            type: "object",
            properties: {
              uploadUrl: { type: "string" },
              photoId: { type: "string" },
              storagePath: { type: "string" },
              publicUrl: { type: "string" },
            },
          },
        },
        401: { description: "Sessão ausente ou inválida.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro de configuração ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/animals/{id}/photos": {
    get: {
      tags: ["Animals"],
      operationId: "listAnimalPhotos",
      summary: "Lista todas as fotos de um animal.",
      parameters: [{ in: "path", name: "id", required: true, type: "string", format: "uuid" }],
      responses: {
        200: {
          description: "Fotos do animal.",
          schema: {
            type: "array",
            items: { $ref: "#/definitions/AnimalPhoto" },
          },
        },
        500: { description: "Erro de configuração ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
    post: {
      tags: ["Animals"],
      operationId: "uploadAnimalPhoto",
      summary: "Registra uma foto ou envia via multipart.",
      security: [{ bearerAuth: [] }],
      consumes: ["application/json", "multipart/form-data"],
      parameters: [
        { in: "path", name: "id", required: true, type: "string", format: "uuid" },
        { in: "formData", name: "photo", required: false, type: "file", description: "JPEG, PNG, WebP ou AVIF com ate 5MB." },
        {
          in: "body",
          name: "body",
          required: false,
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              storage_path: { type: "string" },
              public_url: { type: "string" },
              content_type: { type: "string" },
              size_bytes: { type: "number" },
            },
          },
        },
      ],
      responses: {
        201: { description: "Foto registrada.", schema: { $ref: "#/definitions/AnimalPhoto" } },
        400: { description: "Dados inválidos.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessão ausente ou inválida.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro de configuração ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
};
