export const interestDefinitions = {
  InterestCreateRequest: {
    type: "object",
    properties: {
      animal_id: { type: "string", format: "uuid" },
    },
    required: ["animal_id"],
  },
  InterestSummary: {
    type: "object",
    properties: {
      uuid_registro: { type: "string", format: "uuid" },
      tutor_id: { type: "string", format: "uuid" },
      animal_id: { type: "string", format: "uuid" },
      data_registro: { type: "string", format: "date-time" },
      detail_url: { type: "string" },
      animal: { $ref: "#/definitions/Animal" },
      schedule: {
        type: "array",
        items: { $ref: "#/definitions/CalendarEvent" },
      },
      has_schedule: { type: "boolean" },
      already_exists: { type: "boolean" },
    },
    required: ["uuid_registro", "tutor_id", "animal_id", "detail_url"],
  },
  InterestDetail: {
    type: "object",
    properties: {
      uuid_registro: { type: "string", format: "uuid" },
      tutor_id: { type: "string", format: "uuid" },
      animal_id: { type: "string", format: "uuid" },
      data_registro: { type: "string", format: "date-time" },
      tutor: {
        type: "object",
        additionalProperties: true,
      },
      animal: { $ref: "#/definitions/Animal" },
      schedule: {
        type: "array",
        items: { $ref: "#/definitions/CalendarEvent" },
      },
      has_schedule: { type: "boolean" },
    },
    required: ["uuid_registro", "tutor_id", "animal_id", "tutor", "animal", "schedule", "has_schedule"],
  },
};
