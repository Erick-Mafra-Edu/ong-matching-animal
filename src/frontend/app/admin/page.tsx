import { showAdminCalendarScreen, showSignupLocationFields } from "@/flags";
import AdminPageWrapper from "./AdminPageWrapper";

export default async function AdminPage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();
  const showLocationFields = await showSignupLocationFields();

  return <AdminPageWrapper hideLocationFields={!showLocationFields} showCalendar={showCalendar} />;
}
