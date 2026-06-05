import dynamic from "next/dynamic";
import { showAdminCalendarScreen } from "@/flags";

const AdminPanel = dynamic(
  () => import("@/components/features/Admin/AdminPanel").then((mod) => mod.AdminPanel),
  {
    ssr: false,
    loading: () => (
      <main className="min-h-screen bg-[#0e0e12] px-4 py-6 text-white md:px-8 lg:px-12">
        <p className="text-sm text-slate-300">Carregando painel administrativo...</p>
      </main>
    ),
  },
);

export default async function AdminPage() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const showCalendar = isDevelopment || await showAdminCalendarScreen();

  return <AdminPanel showCalendarConfig={showCalendar} />;
}
