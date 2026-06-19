export const calendarPaths = {
  "/calendar-events": {
    get: {
      tags: ["Calendar"],
      operationId: "listCalendarEvents",
      summary: "Lista eventos do calendario administrativo.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "query", name: "from", required: false, type: "string", format: "date-time" },
        { in: "query", name: "to", required: false, type: "string", format: "date-time" },
      ],
      responses: {
        200: {
          description: "Eventos do calendario.",
          schema: {
            type: "array",
            items: { $ref: "#/definitions/CalendarEvent" },
          },
        },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao carregar calendario.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
    post: {
      tags: ["Calendar"],
      operationId: "createCalendarEvent",
      summary: "Cria evento do calendario administrativo.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: "body",
          name: "body",
          required: true,
          schema: { $ref: "#/definitions/CalendarEventInput" },
        },
      ],
      responses: {
        201: { description: "Evento criado.", schema: { $ref: "#/definitions/CalendarEvent" } },
        400: { description: "Payload invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao criar evento.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
  "/calendar-events/{id}": {
    put: {
      tags: ["Calendar"],
      operationId: "updateCalendarEvent",
      summary: "Atualiza evento do calendario administrativo.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, type: "string", format: "uuid" },
        {
          in: "body",
          name: "body",
          required: true,
          schema: { $ref: "#/definitions/CalendarEventPatchInput" },
        },
      ],
      responses: {
        200: { description: "Evento atualizado.", schema: { $ref: "#/definitions/CalendarEvent" } },
        400: { description: "Payload invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao atualizar evento.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
    delete: {
      tags: ["Calendar"],
      operationId: "deleteCalendarEvent",
      summary: "Remove evento do calendario administrativo.",
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: "path", name: "id", required: true, type: "string", format: "uuid" },
      ],
      responses: {
        200: { description: "Evento removido.", schema: { $ref: "#/definitions/CalendarEventDeleteResponse" } },
        400: { description: "Identificador invalido.", schema: { $ref: "#/definitions/ErrorResponse" } },
        401: { description: "Sessao administrativa invalida ou ausente.", schema: { $ref: "#/definitions/ErrorResponse" } },
        403: { description: "Acesso administrativo negado.", schema: { $ref: "#/definitions/ErrorResponse" } },
        500: { description: "Erro ao remover evento.", schema: { $ref: "#/definitions/ErrorResponse" } },
      },
    },
  },
};
