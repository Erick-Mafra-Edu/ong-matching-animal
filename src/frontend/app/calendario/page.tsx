import { notFound } from "next/navigation";
import { CalendarPage } from "@/components/features/Calendar/CalendarPage";
import { hideSignupLocationFields, showAdminCalendarScreen } from "@/flags";

export default async function CalendarioPage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();
  const hideLocationFields = await hideSignupLocationFields();

  if (!showCalendar) notFound();

  return <CalendarPage hideLocationFields={hideLocationFields} />;
}
