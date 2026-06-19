"use client";

import dynamic from "next/dynamic";

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

export default function AdminPageWrapper({
  hideLocationFields,
  showCalendar,
}: {
  hideLocationFields: boolean;
  showCalendar: boolean;
}) {
  return <AdminPanel hideLocationFields={hideLocationFields} showCalendarConfig={showCalendar} />;
}
