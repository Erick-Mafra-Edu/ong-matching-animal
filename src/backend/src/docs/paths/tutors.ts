export const tutorPaths = {
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
          schema: { $ref: "#/definitions/PasswordRecoveryRequest" },
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
          schema: { $ref: "#/definitions/ChangePasswordRequest" },
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
  "/tutors/me/onboarding-status": {
    get: {
      tags: ["Tutors"],
      operationId: "getOnboardingStatus",
      summary: "Retorna status do onboarding do tutor autenticado.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Status do onboarding.", schema: { $ref: "#/definitions/OnboardingStatus" } },
        401: { description: "Sessao ausente ou invalida.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro de configuracao ou Supabase.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
};
