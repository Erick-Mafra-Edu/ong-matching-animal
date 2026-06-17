"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { fetchDiscoverAccess } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface DiscoverGateProps {
  children: ReactNode;
}

interface DiscoverAccessContextValue {
  tutorId: string | null;
}

const DiscoverAccessContext = createContext<DiscoverAccessContextValue>({ tutorId: null });

export function useDiscoverAccess() {
  return useContext(DiscoverAccessContext);
}

export function DiscoverGate({ children }: DiscoverGateProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [tutorId, setTutorId] = useState<string | null>(null);

  useEffect(() => {
    async function validateAccess() {
      try {
        const access = await fetchDiscoverAccess(getSupabaseBrowserClient());
        if (!access.authenticated) {
          router.replace("/login");
          return;
        }
        if (!access.onboarding_complete) {
          router.replace("/onboarding");
          return;
        }
        setTutorId(access.tutor_id);
        setAllowed(true);
      } catch {
        router.replace("/login");
      }
    }

    void validateAccess();
  }, [router]);

  return allowed ? (
    <DiscoverAccessContext.Provider value={{ tutorId }}>
      {children}
    </DiscoverAccessContext.Provider>
  ) : (
    <main className="grid min-h-screen place-items-center bg-[#0e0e12] text-cyan-100">
      <p className="animate-loading-pulse text-sm uppercase tracking-[0.25em]">Preparando seus matches...</p>
    </main>
  );
}
