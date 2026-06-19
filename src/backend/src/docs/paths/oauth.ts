export const oauthPaths = {
  "/oauth/{provider}/start": {
    get: {
      tags: ["Calendar OAuth"],
      operationId: "startCalendarOAuth",
      summary: "Inicia fluxo OAuth para Google ou Microsoft.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "provider", required: true, type: "string", enum: ["google", "microsoft"] },
      ],
      responses: {
        200: { description: "URL de autorizacao.", schema: { $ref: "#/definitions/CalendarOAuthStartResponse" } },
        400: { description: "Provider invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Variaveis OAuth nao configuradas.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/oauth/{provider}/callback": {
    get: {
      tags: ["Calendar OAuth"],
      operationId: "callbackCalendarOAuth",
      summary: "Recebe callback OAuth e salva conexao administrativa.",
      parameters: [
        { in: "path", name: "provider", required: true, type: "string", enum: ["google", "microsoft"] },
        { in: "query", name: "code", required: false, type: "string" },
        { in: "query", name: "state", required: false, type: "string" },
      ],
      responses: {
        302: { description: "Redirecionado ao painel administrativo apos conectar." },
        400: { description: "State, code ou provider invalidos." },
        403: { description: "Acesso administrativo necessario." },
        500: { description: "Falha ao salvar conexao OAuth." },
      },
    },
  },
  "/oauth/{provider}/refresh": {
    post: {
      tags: ["Calendar OAuth"],
      operationId: "refreshCalendarOAuth",
      summary: "Renova token OAuth salvo.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "provider", required: true, type: "string", enum: ["google", "microsoft"] },
      ],
      responses: {
        200: {
          description: "Token renovado.",
          schema: {
            type: "object",
            properties: { refreshed: { type: "boolean" } },
            required: ["refreshed"],
          },
        },
        400: { description: "Conexao sem refresh token ou provider invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao renovar OAuth.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/oauth/{provider}/disconnect": {
    post: {
      tags: ["Calendar OAuth"],
      operationId: "disconnectCalendarOAuth",
      summary: "Desconecta integracao OAuth ativa.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "provider", required: true, type: "string", enum: ["google", "microsoft"] },
      ],
      responses: {
        200: {
          description: "Conexao desativada.",
          schema: {
            type: "object",
            properties: { disconnected: { type: "boolean" } },
            required: ["disconnected"],
          },
        },
        400: { description: "Provider invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao desconectar OAuth.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/oauth/{provider}/status": {
    get: {
      tags: ["Calendar OAuth"],
      operationId: "getCalendarOAuthStatus",
      summary: "Consulta status da conexao OAuth.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "provider", required: true, type: "string", enum: ["google", "microsoft"] },
      ],
      responses: {
        200: { description: "Status da conexao.", schema: { $ref: "#/definitions/CalendarOAuthStatusResponse" } },
        400: { description: "Provider invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao consultar OAuth.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/auth/callback/{provider}": {
    get: {
      tags: ["Calendar OAuth"],
      operationId: "callbackCalendarOAuthAlias",
      summary: "Alias do callback OAuth.",
      parameters: [
        { in: "path", name: "provider", required: true, type: "string", enum: ["google", "microsoft"] },
      ],
      responses: {
        302: { description: "Redirecionado ao painel administrativo apos conectar." },
      },
    },
  },
  "/auth/start/{provider}": {
    get: {
      tags: ["Calendar OAuth"],
      operationId: "startCalendarOAuthAlias",
      summary: "Alias do inicio do fluxo OAuth.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "provider", required: true, type: "string", enum: ["google", "microsoft"] },
      ],
      responses: {
        200: { description: "URL de autorizacao.", schema: { $ref: "#/definitions/CalendarOAuthStartResponse" } },
      },
    },
  },
};
