export const ongPaths = {
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
};
