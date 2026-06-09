import { InterestDetailPageClient } from "@/components/features/Interests/InterestDetailPageClient";
import { showAdminCalendarScreen } from "@/flags";

export default async function InteresseDetalhePage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();

  return <InterestDetailPageClient showCalendarConfig={showCalendar} />;
}
