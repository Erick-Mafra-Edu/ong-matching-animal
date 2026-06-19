export const interestPaths = {
  "/interessados": {
    get: {
      tags: ["Interests"],
      operationId: "listMineInterests",
      summary: "Lista os interesses do tutor autenticado.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Lista de interesses do tutor.",
          schema: {
            type: "array",
            items: { $ref: "#/definitions/InterestSummary" },
          },
        },
        401: { description: "Sessao invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        404: { description: "Cadastro de tutor nao encontrado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao listar interesses.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
    post: {
      tags: ["Interests"],
      operationId: "createInterest",
      summary: "Registra interesse do tutor autenticado em um animal.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "body",
          name: "body",
          required: true,
          schema: { $ref: "#/definitions/InterestCreateRequest" },
        },
      ],
      responses: {
        200: { description: "Interesse ja existente.", schema: { $ref: "#/definitions/InterestSummary" } },
        201: { description: "Interesse criado.", schema: { $ref: "#/definitions/InterestSummary" } },
        400: { description: "Payload invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        404: { description: "Tutor nao encontrado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao registrar interesse.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/interessados/{uuid_registro}": {
    get: {
      tags: ["Interests"],
      operationId: "getInterestDetail",
      summary: "Retorna detalhes de um registro de interesse.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "uuid_registro", required: true, type: "string", format: "uuid" },
      ],
      responses: {
        200: { description: "Detalhe do interesse.", schema: { $ref: "#/definitions/InterestDetail" } },
        400: { description: "Identificador invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Sem permissao para acessar o interesse.", schema: { $ref: "#/definitions/ErrorResponse" } },
        404: { description: "Interesse nao encontrado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao carregar interesse.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
};
