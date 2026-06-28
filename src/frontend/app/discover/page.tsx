import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdoptionDashboard } from "@/components/features/AdoptionDashboard/AdoptionDashboard";
import { ScreenOnboardingRuntime } from "@/components/features/Onboarding/ScreenOnboardingRuntime";
import { authCookieNames } from "@/lib/auth/session";
import { fetchAnimalsPage, isNoAnimalsAvailableMessage, type AnimalsPageResponse } from "@/lib/discover";

interface DiscoverAccessResponse {
  authenticated: boolean;
  onboarding_complete: boolean;
  tutor_id: string | null;
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Host da requisicao ausente.");
  }

  return `${protocol}://${host}`;
}

async function fetchDiscoverAccessServer(accessToken: string): Promise<DiscoverAccessResponse> {
  const origin = await getRequestOrigin();
  const response = await fetch(`${origin}/api/tutors/me/discover-access`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    return {
      authenticated: false,
      onboarding_complete: false,
      tutor_id: null,
    };
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel validar o acesso ao discover.");
  }

  return response.json() as Promise<DiscoverAccessResponse>;
}

async function fetchInitialAnimals(tutorId: string | null, accessToken: string): Promise<AnimalsPageResponse> {
  const origin = await getRequestOrigin();
  return fetchAnimalsPage(0, {
    tutorId,
    accessToken,
    baseUrl: origin,
    init: {
      cache: "no-store",
    },
  });
}

export default async function DiscoverPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;

  if (!accessToken) {
    redirect("/login?redirect=/discover");
  }

  const access = await fetchDiscoverAccessServer(accessToken);

  if (!access.authenticated) {
    redirect("/login?redirect=/discover");
  }

  if (!access.onboarding_complete) {
    redirect("/onboarding");
  }

  let initialPage: AnimalsPageResponse | undefined;
  let status: "ready" | "empty" | "error" = "ready";

  try {
    initialPage = await fetchInitialAnimals(access.tutor_id, accessToken);
  } catch (error) {
    status = error instanceof Error && isNoAnimalsAvailableMessage(error.message) ? "empty" : "error";
    console.error("DiscoverPage: failed to load initial animals", error);
  }

  return (
    <>
      <AdoptionDashboard initialPage={initialPage} status={status} tutorId={access.tutor_id} />
      <ScreenOnboardingRuntime />
    </>
  );
}
