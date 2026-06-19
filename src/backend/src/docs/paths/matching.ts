export const matchingPaths = {
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
};
