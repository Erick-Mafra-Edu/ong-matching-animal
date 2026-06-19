export const matchingDefinitions = {
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
};
