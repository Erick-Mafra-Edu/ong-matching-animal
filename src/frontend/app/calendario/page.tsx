import { notFound } from "next/navigation";
import { CalendarPage } from "@/components/features/Calendar/CalendarPage";
import { showAdminCalendarScreen, showSignupLocationFields } from "@/flags";

export default async function CalendarioPage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();
  const showLocationFields = await showSignupLocationFields();

  if (!showCalendar) notFound();

  return <CalendarPage hideLocationFields={!showLocationFields} />;
}
