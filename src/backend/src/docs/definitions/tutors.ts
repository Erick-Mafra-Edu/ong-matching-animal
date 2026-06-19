export const tutorDefinitions = {
  PasswordRecoveryRequest: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
    },
    required: ["email"],
  },
  ChangePasswordRequest: {
    type: "object",
    properties: {
      current_password: { type: "string", minLength: 6 },
      new_password: { type: "string", minLength: 8 },
    },
    required: ["current_password", "new_password"],
  },
  TutorInput: {
    type: "object",
    properties: {
      auth_user_id: { type: "string", format: "uuid" },
      name: { type: "string" },
      custom_fields: {
        type: "object",
        additionalProperties: true,
      },
    },
    required: ["auth_user_id", "name", "custom_fields"],
  },
  Tutor: {
    allOf: [
      { $ref: "#/definitions/TutorInput" },
      {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    ],
  },
  DiscoverAccess: {
    type: "object",
    properties: {
      authenticated: { type: "boolean" },
      onboarding_complete: { type: "boolean" },
      onboarding_completed_at: { type: "string", format: "date-time" },
      questionnaire_updated_at: { type: "string", format: "date-time" },
      onboarding_outdated: { type: "boolean" },
      tutor_id: { type: "string" },
    },
    required: ["authenticated", "onboarding_complete"],
  },
  AccountProfile: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      auth_user_id: { type: "string", format: "uuid" },
      email: { type: "string" },
      name: { type: "string" },
      onboarding_completed_at: { type: "string", format: "date-time" },
      questionnaire_updated_at: { type: "string", format: "date-time" },
      onboarding_outdated: { type: "boolean" },
    },
    required: ["auth_user_id", "name", "onboarding_outdated"],
  },
  OnboardingStatus: {
    type: "object",
    properties: {
      onboarding_complete: { type: "boolean" },
      onboarding_completed_at: { type: "string", format: "date-time" },
      questionnaire_updated_at: { type: "string", format: "date-time" },
      onboarding_outdated: { type: "boolean" },
    },
    required: ["onboarding_complete", "onboarding_outdated"],
  },
};
