import { flag } from "flags/next";
import { vercelAdapter } from "@flags-sdk/vercel";

const calendarFlagBase = {
  key: "admin-calendar-screen",
  description: "Exibe a tela administrativa de calendário.",
};

const signupLocationFlagBase = {
  key: "hide-signup-location-fields",
  description: "Oculta perguntas de localização nas telas de cadastro e onboarding.",
};

export const showAdminCalendarScreen = process.env.NODE_ENV === "development"
  ? flag<boolean>({
    ...calendarFlagBase,
    decide: () => true,
  })
  : flag<boolean>({
    ...calendarFlagBase,
    adapter: vercelAdapter(),
    decide: () => false,
  });

export const hideSignupLocationFields = process.env.NODE_ENV === "development"
  ? flag<boolean>({
    ...signupLocationFlagBase,
    decide: () => false,
  })
  : flag<boolean>({
    ...signupLocationFlagBase,
    adapter: vercelAdapter(),
    decide: () => false,
  });
