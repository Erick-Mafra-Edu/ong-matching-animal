import { InterestDetailPageClient } from "@/components/features/Interests/InterestDetailPageClient";
import { showAdminCalendarScreen, showSignupLocationFields } from "@/flags";

export default async function InteresseDetalhePage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();
  const showLocationFields = await showSignupLocationFields();

  return <InterestDetailPageClient hideLocationFields={!showLocationFields} showCalendarConfig={showCalendar} />;
}
