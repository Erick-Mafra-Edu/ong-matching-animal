"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthCallbackHandler() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthCallback() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) return;

      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      try {
        router.replace(await hasCompletedOnboarding(supabase, data.user.id) ? "/discover" : "/onboarding");
      } catch {
        router.replace("/onboarding");
      }
    }

    void handleAuthCallback();
  }, [router]);

  return null;
}
