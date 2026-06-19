export const onboardingPaths = {
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
  "/onboarding-eligibility": {
    post: {
      tags: ["Onboarding"],
      operationId: "validateOnboardingEligibility",
      summary: "Valida se as respostas do onboarding atendem aos requisitos minimos da ONG.",
      parameters: [
        {
          in: "body",
          name: "body",
          required: true,
          schema: { $ref: "#/definitions/OnboardingEligibilityRequest" },
        },
      ],
      responses: {
        200: {
          description: "Resultado da validacao de elegibilidade.",
          schema: { $ref: "#/definitions/OnboardingEligibilityResult" },
        },
        400: {
          description: "Payload invalido.",
          schema: { $ref: "#/definitions/ErrorResponse" },
        },
        500: {
          description: "Erro de configuração ou conexão Supabase.",
          schema: { $ref: "#/definitions/ErrorResponse" },
        },
      },
    },
  },
};
