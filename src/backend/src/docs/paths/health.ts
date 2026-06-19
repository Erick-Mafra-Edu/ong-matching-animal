export const healthPaths = {
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
};
