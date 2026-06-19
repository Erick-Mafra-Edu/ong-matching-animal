import { hideSignupLocationFields, showAdminCalendarScreen } from "@/flags";
import AdminPageWrapper from "./AdminPageWrapper";

export default async function AdminPage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();
  const hideLocationFields = await hideSignupLocationFields();

  return <AdminPageWrapper hideLocationFields={hideLocationFields} showCalendar={showCalendar} />;
}
