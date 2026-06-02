"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface DiscoverGateProps {
  children: ReactNode;
}

export function DiscoverGate({ children }: DiscoverGateProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function validateAccess() {
      try {
        const { data, error } = await getSupabaseBrowserClient().auth.getUser();
        if (error || !data.user) {
          router.replace("/login");
          return;
        }
        if (!await hasCompletedOnboarding(getSupabaseBrowserClient(), data.user.id)) {
          router.replace("/onboarding");
          return;
        }
        setAllowed(true);
      } catch {
        router.replace("/onboarding");
      }
    }

    void validateAccess();
  }, [router]);

  return allowed ? children : (
    <main className="grid min-h-screen place-items-center bg-[#0e0e12] text-cyan-100">
      <p className="animate-loading-pulse text-sm uppercase tracking-[0.25em]">Preparando seus matches...</p>
    </main>
  );
}
