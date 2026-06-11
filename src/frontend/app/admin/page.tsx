import { showAdminCalendarScreen } from "@/flags";
import AdminPageWrapper from "./AdminPageWrapper";

export default async function AdminPage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();

  return <AdminPageWrapper showCalendar={showCalendar} />;
}
