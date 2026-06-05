import { notFound } from "next/navigation";
import { CalendarPage } from "@/components/features/Calendar/CalendarPage";
import { showAdminCalendarScreen } from "@/flags";

export default async function CalendarioPage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();

  if (!showCalendar) notFound();

  return <CalendarPage />;
}
