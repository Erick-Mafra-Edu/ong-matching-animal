import { flag } from "flags/next";
import { vercelAdapter } from "@flags-sdk/vercel";

const calendarFlagBase = {
  key: "admin-calendar-screen",
  description: "Exibe a tela administrativa de calendário.",
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
