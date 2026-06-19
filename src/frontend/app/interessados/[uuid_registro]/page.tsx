import { InterestDetailPageClient } from "@/components/features/Interests/InterestDetailPageClient";
import { hideSignupLocationFields, showAdminCalendarScreen } from "@/flags";

export default async function InteresseDetalhePage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();
  const hideLocationFields = await hideSignupLocationFields();

  return <InterestDetailPageClient hideLocationFields={hideLocationFields} showCalendarConfig={showCalendar} />;
}
