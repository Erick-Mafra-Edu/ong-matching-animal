"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { featuredPet, navigationItems } from "@/data/adoption.mock";
import type { DashboardStatus } from "@/types/adoption";
import { DashboardState } from "./DashboardState";
import { MatchActions } from "./MatchActions";
import { MobileNavigation } from "./MobileNavigation";
import { PetPhotoCard } from "./PetPhotoCard";
import { ProfileSummary } from "./ProfileSummary";

interface AdoptionDashboardProps {
  status?: DashboardStatus;
}

export function AdoptionDashboard({ status = "ready" }: AdoptionDashboardProps) {
  if (status !== "ready") {
    return <DashboardState status={status} />;
  }

  return (
    <PageContainer>
      <div className="grid w-full md:grid-cols-[minmax(360px,430px)_1fr] md:items-center md:gap-16 lg:gap-24">
        <div>
          <PetPhotoCard pet={featuredPet} />
          <div className="md:hidden">
            <div className="bg-black px-5 py-3">
              <MatchActions />
            </div>
            <MobileNavigation items={navigationItems} />
          </div>
        </div>
        <section className="hidden max-w-[620px] space-y-12 md:block" aria-label="Detalhes e ações de adoção">
          <ProfileSummary pet={featuredPet} />
          <MatchActions />
        </section>
      </div>
    </PageContainer>
  );
}
