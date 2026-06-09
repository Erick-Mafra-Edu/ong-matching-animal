"use client";

import dynamic from "next/dynamic";

const ScreenOnboarding = dynamic(
  () => import("@/components/features/Onboarding/ScreenOnboarding").then((mod) => mod.ScreenOnboarding),
  { ssr: false },
);

export function ScreenOnboardingRuntime() {
  return <ScreenOnboarding />;
}
