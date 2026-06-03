"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasCompletedOnboarding, saveOnboardingAnswersFromMetadata } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthCallbackHandler() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthCallback() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const authError = params.get("error");
      const authErrorCode = params.get("error_code");

      if (authError) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        router.replace(`/login?auth_error=${encodeURIComponent(authErrorCode ?? authError)}`);
        return;
      }

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
        const completed = await hasCompletedOnboarding(supabase, data.user.id) || await saveOnboardingAnswersFromMetadata(supabase, data.user);
        router.replace(completed ? "/discover" : "/onboarding");
      } catch {
        router.replace("/onboarding");
      }
    }

    void handleAuthCallback();
  }, [router]);

  return null;
}
