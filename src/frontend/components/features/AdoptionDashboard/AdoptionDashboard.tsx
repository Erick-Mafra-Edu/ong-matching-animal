"use client";

import { useState } from "react";
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

export type SwipeDirection = "left" | "right";

export interface CardAction {
  direction: SwipeDirection;
  id: number;
}

export function AdoptionDashboard({ status = "ready" }: AdoptionDashboardProps) {
  const [cardAction, setCardAction] = useState<CardAction | null>(null);

  if (status !== "ready") {
    return <DashboardState status={status} />;
  }

  function requestCardAction(direction: SwipeDirection) {
    setCardAction({ direction, id: Date.now() });
  }

  return (
    <PageContainer>
      <div className="grid w-full md:grid-cols-[minmax(360px,430px)_1fr] md:items-center md:gap-16 lg:gap-24">
        <div>
          <PetPhotoCard action={cardAction} pet={featuredPet} />
          <div className="md:hidden">
            <div className="animate-actions-enter bg-black px-5 py-3">
              <MatchActions onAdopt={() => requestCardAction("right")} onReject={() => requestCardAction("left")} />
            </div>
            <MobileNavigation items={navigationItems} />
          </div>
        </div>
        <section className="animate-details-enter hidden max-w-[620px] space-y-12 md:block" aria-label="Detalhes e ações de adoção">
          <ProfileSummary pet={featuredPet} />
          <div className="animate-actions-enter">
            <MatchActions onAdopt={() => requestCardAction("right")} onReject={() => requestCardAction("left")} />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
