import { RequestHandler } from "express";

const operationPassThrough: RequestHandler = (_req, _res, next) => next();

export const apiDoc = {
  swagger: "2.0",
  basePath: "/api",
  info: {
    title: "ONG Matching Animal API",
    version: "0.1.0",
    description: "API para cadastro de tutores, perguntas de onboarding, animais e matching.",
  },
  schemes: ["http", "https"],
  consumes: ["application/json"],
  produces: ["application/json"],
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      in: "header",
      description: "Token Supabase no formato: Bearer <access_token>",
    },
  },
  tags: [
    { name: "Health" },
    { name: "Onboarding" },
    { name: "ONG Settings" },
    { name: "Tutors" },
    { name: "Animals" },
    { name: "Matching" },
  ],
  definitions: {
    ErrorResponse: {
      type: "object",
      properties: {
        message: { type: "string" },
        details: {},
      },
      required: ["message"],
    },
    OnboardingQuestion: {
      type: "object",
      properties: {
        id: { type: "string" },
        label: { type: "string" },
        description: { type: "string" },
        placeholder: { type: "string" },
        type: { type: "string", enum: ["text", "select", "radio", "boolean", "multiselect"] },
        options: {
          type: "array",
          items: { $ref: "#/definitions/QuestionOption" },
        },
        required: { type: "boolean" },
      },
      required: ["id", "label", "type", "required"],
    },
    QuestionOption: {
      type: "object",
      properties: {
        label: { type: "string" },
        value: { type: "string" },
      },
      required: ["label", "value"],
    },
    OngSettings: {
      type: "object",
      properties: {
        id: { type: "string" },
        ong_name: { type: "string" },
        contact_email: { type: "string" },
        contact_phone: { type: "string" },
        whatsapp_phone: { type: "string" },
        website_url: { type: "string" },
        address_line: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        postal_code: { type: "string" },
        social_links: { type: "object", additionalProperties: true },
        business_hours: { type: "object", additionalProperties: true },
        adoption_message_template: { type: "string" },
        settings: { type: "object", additionalProperties: true },
      },
      required: ["id", "ong_name", "social_links", "business_hours", "settings"],
    },
    TutorInput: {
      type: "object",
      properties: {
        auth_user_id: { type: "string", format: "uuid" },
        name: { type: "string" },
        custom_fields: {
          type: "object",
          additionalProperties: true,
        },
      },
      required: ["auth_user_id", "name", "custom_fields"],
    },
    Tutor: {
      allOf: [
        { $ref: "#/definitions/TutorInput" },
        {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      ],
    },
    DiscoverAccess: {
      type: "object",
      properties: {
        authenticated: { type: "boolean" },
        onboarding_complete: { type: "boolean" },
        onboarding_completed_at: { type: "string", format: "date-time" },
        questionnaire_updated_at: { type: "string", format: "date-time" },
        onboarding_outdated: { type: "boolean" },
        tutor_id: { type: "string" },
      },
      required: ["authenticated", "onboarding_complete"],
    },
    AccountProfile: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        auth_user_id: { type: "string", format: "uuid" },
        email: { type: "string" },
        name: { type: "string" },
        onboarding_completed_at: { type: "string", format: "date-time" },
        questionnaire_updated_at: { type: "string", format: "date-time" },
        onboarding_outdated: { type: "boolean" },
      },
      required: ["auth_user_id", "name", "onboarding_outdated"],
    },
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
    MatchRequest: {
      type: "object",
      properties: {
        tutor_id: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 },
        max_distance_km: {
          type: "number",
          minimum: 0,
          description: "Raio maximo em km. Envie null na API para desabilitar o filtro geográfico.",
        },
      },
      required: ["tutor_id"],
    },
    MatchResponse: {
      type: "object",
      properties: {
        tutor_id: { type: "string" },
        tutor_name: { type: "string" },
        total_animals_evaluated: { type: "number" },
        matches: { type: "array", items: { type: "object" } },
        timestamp: { type: "string", format: "date-time" },
      },
      required: ["tutor_id", "tutor_name", "total_animals_evaluated", "matches", "timestamp"],
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        operationId: "getHealth",
        summary: "Retorna o status da API.",
        responses: {
          200: {
            description: "API operacional.",
            schema: {
              type: "object",
              properties: {
                status: { type: "string" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
    "/onboarding-questions": {
      get: {
        tags: ["Onboarding"],
        operationId: "listOnboardingQuestions",
        summary: "Lista perguntas ativas do onboarding.",
        responses: {
          200: {
            description: "Perguntas ativas ordenadas.",
            schema: {
              type: "array",
              items: { $ref: "#/definitions/OnboardingQuestion" },
            },
          },
          500: {
            description: "Configuração ou conexão Supabase inválida.",
            schema: { $ref: "#/definitions/ErrorResponse" },
          },
        },
      },
    },
    "/ong-settings": {
      get: {
        tags: ["ONG Settings"],
        operationId: "getOngSettings",
        summary: "Retorna configuracoes publicas de contato da ONG.",
        responses: {
          200: {
            description: "Configuracoes ativas da ONG.",
            schema: { $ref: "#/definitions/OngSettings" },
          },
          500: {
            description: "Configuração ou conexão Supabase inválida.",
            schema: { $ref: "#/definitions/ErrorResponse" },
          },
        },
      },
    },
    "/tutors": {
      post: {
        tags: ["Tutors"],
        operationId: "upsertTutor",
        summary: "Cria ou atualiza o tutor autenticado.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "body",
            name: "body",
            required: true,
            schema: { $ref: "#/definitions/TutorInput" },
          },
        ],
        responses: {
          201: {
            description: "Tutor salvo.",
            schema: { $ref: "#/definitions/Tutor" },
          },
          400: { description: "Payload inválido.", schema: { $ref: "#/definitions/ErrorResponse" } },
          401: { description: "Sessão ausente ou inválida.", schema: { $ref: "#/definitions/ErrorResponse" } },
          403: { description: "Usuário tentando salvar outro perfil.", schema: { $ref: "#/definitions/ErrorResponse" } },
          500: { description: "Erro de configuração ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
        },
      },
    },
    "/tutors/{id}": {
      get: {
        tags: ["Tutors"],
        operationId: "getTutorById",
        summary: "Placeholder para consulta de tutor por ID.",
        parameters: [{ in: "path", name: "id", required: true, type: "string" }],
        responses: {
          200: { description: "Resposta placeholder." },
        },
      },
    },
    "/tutors/me": {
      get: {
        tags: ["Tutors"],
        operationId: "getTutorMe",
        summary: "Retorna o perfil de conta do tutor autenticado.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Perfil autenticado.", schema: { $ref: "#/definitions/AccountProfile" } },
          401: { description: "Sessao ausente ou invalida.", schema: { $ref: "#/definitions/ErrorResponse" } },
          500: { description: "Erro de configuracao ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
        },
      },
      patch: {
        tags: ["Tutors"],
        operationId: "updateTutorMe",
        summary: "Atualiza dados editaveis da conta do tutor autenticado.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "body",
            name: "body",
            required: true,
            schema: {
              type: "object",
              properties: { name: { type: "string", minLength: 2, maxLength: 120 } },
              required: ["name"],
            },
          },
        ],
        responses: {
          200: { description: "Perfil atualizado.", schema: { $ref: "#/definitions/Tutor" } },
          400: { description: "Payload invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
          401: { description: "Sessao ausente ou invalida.", schema: { $ref: "#/definitions/ErrorResponse" } },
          500: { description: "Erro de configuracao ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
        },
      },
    },
    "/tutors/me/discover-access": {
      get: {
        tags: ["Tutors"],
        operationId: "getDiscoverAccess",
        summary: "Retorna apenas os dados necessarios para liberar a tela Discover.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Status de acesso ao Discover.", schema: { $ref: "#/definitions/DiscoverAccess" } },
          401: { description: "Sessão ausente ou inválida.", schema: { $ref: "#/definitions/ErrorResponse" } },
          500: { description: "Erro de configuração ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
        },
      },
    },
    "/auth/password-recovery": {
      post: {
        tags: ["Tutors"],
        operationId: "requestPasswordRecovery",
        summary: "Solicita recuperacao de senha sem expor existencia de conta.",
        parameters: [
          {
            in: "body",
            name: "body",
            required: true,
            schema: {
              type: "object",
              properties: { email: { type: "string", format: "email" } },
              required: ["email"],
            },
          },
        ],
        responses: {
          200: { description: "Solicitacao aceita." },
          400: { description: "Email invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
          500: { description: "Erro de configuracao.", schema: { $ref: "#/definitions/ErrorResponse" } },
        },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Tutors"],
        operationId: "changePassword",
        summary: "Altera senha do usuario autenticado apos validar a senha atual.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "body",
            name: "body",
            required: true,
            schema: {
              type: "object",
              properties: {
                current_password: { type: "string" },
                new_password: { type: "string", minLength: 8 },
              },
              required: ["current_password", "new_password"],
            },
          },
        ],
        responses: {
          200: { description: "Senha alterada." },
          400: { description: "Senha atual invalida ou payload invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
          401: { description: "Sessao ausente ou invalida.", schema: { $ref: "#/definitions/ErrorResponse" } },
          500: { description: "Erro de configuracao ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
        },
      },
    },
    "/animals": {
      get: {
        tags: ["Animals"],
        operationId: "listAnimals",
        summary: "Lista animais com URLs publicas das fotos em paginas.",
        parameters: [
          { in: "query", name: "limit", required: false, type: "number", description: "Quantidade de itens por pagina. Maximo 50." },
          { in: "query", name: "offset", required: false, type: "number", description: "Indice inicial da pagina." },
        ],
        responses: {
          200: {
            description: "Pagina de animais ordenados por criacao.",
            schema: { $ref: "#/definitions/AnimalPage" },
          },
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
    "/match": {
      post: {
        tags: ["Matching"],
        operationId: "matchTutor",
        summary: "Calcula matches para um tutor.",
        parameters: [
          {
            in: "body",
            name: "body",
            required: true,
            schema: { $ref: "#/definitions/MatchRequest" },
          },
        ],
        responses: {
          200: { description: "Resultado de matching.", schema: { $ref: "#/definitions/MatchResponse" } },
        },
      },
    },
  },
};

export const openApiOperations = {
  getHealth: operationPassThrough,
  getOngSettings: operationPassThrough,
  listOnboardingQuestions: operationPassThrough,
  upsertTutor: operationPassThrough,
  getTutorMe: operationPassThrough,
  updateTutorMe: operationPassThrough,
  getDiscoverAccess: operationPassThrough,
  getTutorById: operationPassThrough,
  requestPasswordRecovery: operationPassThrough,
  changePassword: operationPassThrough,
  listAnimals: operationPassThrough,
  createAnimal: operationPassThrough,
  listAnimalPhotos: operationPassThrough,
  uploadAnimalPhoto: operationPassThrough,
  getAnimalPhotoSignedUrl: operationPassThrough,
  matchTutor: operationPassThrough,
};
