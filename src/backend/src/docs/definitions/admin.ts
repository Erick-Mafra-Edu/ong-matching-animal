export const adminDefinitions = {
  AdminUserCreateRequest: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8 },
      full_name: { type: "string" },
      is_active: { type: "boolean" },
    },
    required: ["email", "password"],
  },
  AdminUser: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      auth_user_id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      is_active: { type: "boolean" },
      created_by: { type: "string", format: "uuid" },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  AdminMe: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      auth_user_id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      is_active: { type: "boolean" },
    },
    required: ["id", "auth_user_id", "email", "is_active"],
  },
  AdminBootstrapResponse: {
    type: "object",
    properties: {
      admin: { $ref: "#/definitions/AdminMe" },
      custom_fields: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
      onboarding_questions: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
      resource: { type: "string" },
      rows: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
    },
    required: ["admin", "custom_fields", "onboarding_questions", "resource", "rows"],
  },
  GenericAdminResourcePayload: {
    type: "object",
    additionalProperties: true,
  },
};
