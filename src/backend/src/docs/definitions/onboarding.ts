export const onboardingDefinitions = {
  OnboardingQuestion: {
    type: "object",
    properties: {
      id: { type: "string" },
      label: { type: "string" },
      description: { type: "string" },
      placeholder: { type: "string" },
      type: { type: "string", enum: ["text", "select", "radio", "boolean", "multiselect"] },
      options: {
        type: "array",
        items: { $ref: "#/definitions/QuestionOption" },
      },
      required: { type: "boolean" },
      is_knockout: { type: "boolean" },
      knockout_values: {
        type: "array",
        items: { type: "string" },
      },
      knockout_message: { type: "string" },
    },
    required: ["id", "label", "type", "required"],
  },
  OnboardingEligibilityRequest: {
    type: "object",
    properties: {
      answers: {
        type: "object",
        additionalProperties: true,
      },
    },
    required: ["answers"],
  },
  OnboardingEligibilityResult: {
    type: "object",
    properties: {
      eligible: { type: "boolean" },
      blocked_question_id: { type: "string" },
      blocked_question_label: { type: "string" },
      message: { type: "string" },
    },
    required: ["eligible"],
  },
  QuestionOption: {
    type: "object",
    properties: {
      label: { type: "string" },
      value: { type: "string" },
    },
    required: ["label", "value"],
  },
};
