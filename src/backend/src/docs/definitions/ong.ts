export const ongDefinitions = {
  OngSettings: {
    type: "object",
    properties: {
      id: { type: "string" },
      ong_name: { type: "string" },
      contact_email: { type: "string" },
      contact_phone: { type: "string" },
      whatsapp_phone: { type: "string" },
      website_url: { type: "string" },
      address_line: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      postal_code: { type: "string" },
      social_links: { type: "object", additionalProperties: true },
      business_hours: { type: "object", additionalProperties: true },
      adoption_message_template: { type: "string" },
      settings: { type: "object", additionalProperties: true },
    },
    required: ["id", "ong_name", "social_links", "business_hours", "settings"],
  },
};
