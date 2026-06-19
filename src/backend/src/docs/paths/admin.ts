export const adminPaths = {
  "/admin/me": {
    get: {
      tags: ["Admin"],
      operationId: "getAdminMe",
      summary: "Retorna o administrador autenticado.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Administrador autenticado.", schema: { $ref: "#/definitions/AdminMe" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/admin/bootstrap": {
    get: {
      tags: ["Admin"],
      operationId: "getAdminBootstrap",
      summary: "Carrega bootstrap do painel administrativo.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "resource", required: false, type: "string" },
      ],
      responses: {
        200: { description: "Bootstrap do painel.", schema: { $ref: "#/definitions/AdminBootstrapResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        404: { description: "Recurso administrativo nao encontrado.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/admin/admin-users": {
    post: {
      tags: ["Admin"],
      operationId: "createAdminUser",
      summary: "Cria um novo usuario administrador.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "body",
          name: "body",
          required: true,
          schema: { $ref: "#/definitions/AdminUserCreateRequest" },
        },
      ],
      responses: {
        201: { description: "Administrador criado.", schema: { $ref: "#/definitions/AdminUser" } },
        400: { description: "Payload invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/admin/{resource}": {
    get: {
      tags: ["Admin"],
      operationId: "listAdminResource",
      summary: "Lista um recurso administrativo dinamico.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "resource", required: true, type: "string" },
        { in: "query", name: "q", required: false, type: "string" },
      ],
      responses: {
        200: {
          description: "Lista de registros do recurso.",
          schema: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
        },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        404: { description: "Recurso administrativo nao encontrado.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
    post: {
      tags: ["Admin"],
      operationId: "createAdminResource",
      summary: "Cria um registro em recurso administrativo dinamico.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "resource", required: true, type: "string" },
        {
          in: "body",
          name: "body",
          required: true,
          schema: { $ref: "#/definitions/GenericAdminResourcePayload" },
        },
      ],
      responses: {
        201: { description: "Recurso criado.", schema: { type: "object", additionalProperties: true } },
        400: { description: "Payload invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        404: { description: "Recurso administrativo nao encontrado.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/admin/{resource}/{id}": {
    put: {
      tags: ["Admin"],
      operationId: "updateAdminResource",
      summary: "Atualiza um registro em recurso administrativo dinamico.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "resource", required: true, type: "string" },
        { in: "path", name: "id", required: true, type: "string" },
        {
          in: "body",
          name: "body",
          required: true,
          schema: { $ref: "#/definitions/GenericAdminResourcePayload" },
        },
      ],
      responses: {
        200: { description: "Recurso atualizado.", schema: { type: "object", additionalProperties: true } },
        400: { description: "Payload ou identificador invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        404: { description: "Recurso administrativo nao encontrado.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
    delete: {
      tags: ["Admin"],
      operationId: "deleteAdminResource",
      summary: "Remove um registro em recurso administrativo dinamico.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "resource", required: true, type: "string" },
        { in: "path", name: "id", required: true, type: "string" },
      ],
      responses: {
        200: {
          description: "Recurso removido.",
          schema: {
            type: "object",
            properties: {
              deleted: { type: "boolean" },
              rows: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
            },
            required: ["deleted", "rows"],
          },
        },
        400: { description: "Identificador invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        404: { description: "Recurso administrativo nao encontrado.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
};
