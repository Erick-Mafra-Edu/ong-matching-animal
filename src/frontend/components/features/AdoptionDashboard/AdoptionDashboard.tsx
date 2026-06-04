"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { navigationItems } from "@/data/adoption.mock";
import { backendApiUrl } from "@/lib/backend";
import type { AnimalListItem, DashboardStatus } from "@/types/adoption";
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

const fallbackPhotosBySpecies: Record<string, string> = {
  cachorro: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1200&q=90",
  gato: "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=1200&q=90",
  coelho: "https://images.unsplash.com/photo-1585565623926-2469211a7b75?auto=format&fit=crop&w=1200&q=90",
};

const defaultFallbackPhoto = "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=90";

function withFallbackPhoto(animal: AnimalListItem): AnimalListItem {
  if (animal.photoUrl || animal.photoUrls?.length) return animal;

  const speciesKey = animal.species?.toLocaleLowerCase("pt-BR") ?? "";
  const photoUrl = fallbackPhotosBySpecies[speciesKey] ?? defaultFallbackPhoto;
  return { ...animal, photoUrl, photoUrls: [photoUrl] };
}

export function AdoptionDashboard({ status = "ready" }: AdoptionDashboardProps) {
  const [cardAction, setCardAction] = useState<CardAction | null>(null);
  const [pets, setPets] = useState<AnimalListItem[]>([]);
  const [history, setHistory] = useState<AnimalListItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<DashboardStatus>(status === "ready" ? "loading" : status);

  useEffect(() => {
    if (status !== "ready") {
      setLoadStatus(status);
      return;
    }

    let isMounted = true;
    setLoadStatus("loading");

    fetch(backendApiUrl("/api/animals"))
      .then(async (response) => {
        if (!response.ok) throw new Error("Nao foi possivel carregar os animais.");
        return response.json() as Promise<AnimalListItem[]>;
      })
      .then((animals) => {
        if (!isMounted) return;
        const availableAnimals = animals.map(withFallbackPhoto);
        setPets(availableAnimals);
        setLoadStatus(availableAnimals.length ? "ready" : "empty");
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [status]);

  if (loadStatus !== "ready") {
    return <DashboardState status={loadStatus} />;
  }

  const featuredPet = pets[0];
  if (!featuredPet) {
    return <DashboardState status="empty" />;
  }

  function requestCardAction(direction: SwipeDirection) {
    setCardAction({ direction, id: Date.now() });
  }

  function handleActionComplete(direction: SwipeDirection) {
    const [current, ...remaining] = pets;
    if (current) {
      setHistory((prev) => [current, ...prev].slice(0, 10)); // Mantem os ultimos 10 no historico
      setPets(remaining);
      setCardAction(null);
      if (remaining.length === 0) {
        setLoadStatus("empty");
      }
    }
  }

  function handleUndo() {
    const [last, ...prevHistory] = history;
    if (last) {
      setPets((prev) => [last, ...prev]);
      setHistory(prevHistory);
      setCardAction(null);
    }
  }

  const actions = (
    <MatchActions
      onAdopt={() => requestCardAction("right")}
      onReject={() => requestCardAction("left")}
      onUndo={history.length > 0 ? handleUndo : undefined}
    />
  );

  return (
    <PageContainer>
      <header className="fixed left-0 right-0 top-0 z-20 hidden border-b border-white/10 bg-[#0e0e12]/90 px-10 py-4 backdrop-blur md:block">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <Link className="text-sm font-semibold text-white" href="/discover">Match Pet</Link>
          <nav aria-label="Navegação desktop">
            <Link className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-200 hover:text-cyan-100" href="/admin">
              Painel administrativo
            </Link>
          </nav>
        </div>
      </header>
      <div className="grid w-full md:grid-cols-[minmax(360px,430px)_1fr] md:items-center md:gap-16 lg:gap-24">
        <div>
          <PetPhotoCard
            action={cardAction}
            onActionComplete={handleActionComplete}
            pet={featuredPet}
          />
          <div className="md:hidden">
            <div className="animate-actions-enter bg-black px-5 py-3">
              {actions}
            </div>
            <MobileNavigation items={navigationItems} />
          </div>
        </div>
        <section className="animate-details-enter hidden max-w-[620px] space-y-12 md:block" aria-label="Detalhes e ações de adoção">
          <ProfileSummary pet={featuredPet} />
          <div className="animate-actions-enter">
            {actions}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
