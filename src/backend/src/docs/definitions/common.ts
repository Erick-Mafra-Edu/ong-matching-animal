export const commonDefinitions = {
  ErrorResponse: {
    type: "object",
    properties: {
      message: { type: "string" },
      details: {},
    },
    required: ["message"],
  },
};
