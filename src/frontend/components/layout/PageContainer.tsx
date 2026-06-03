import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({ children }: PageContainerProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0e0e12] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] items-center px-0 md:px-10 lg:px-16">
        {children}
      </div>
    </main>
  );
}
