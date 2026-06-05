"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { navigationItems } from "@/data/adoption.mock";
import { backendApiUrl } from "@/lib/backend";
import { registrarInteresse } from "@/lib/interessados";
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
  const [actionMessage, setActionMessage] = useState("");
  const [isRegisteringInterest, setIsRegisteringInterest] = useState(false);

  const [lastActionMessageId, setLastActionMessageId] = useState<string | null>(null);

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

  async function handleAdopt() {
    if (!featuredPet || isRegisteringInterest) return;

    setIsRegisteringInterest(true);
    setLastActionMessageId(featuredPet.id);
    setActionMessage("Registrando interesse...");

    try {
      await registrarInteresse(featuredPet.id);
      setActionMessage(`Interesse registrado para ${featuredPet.name}!`);
      requestCardAction("right");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Nao foi possivel registrar o interesse.");
      // Se falhou, limpamos o ID para permitir nova tentativa (via swipe ou botão)
      setLastActionMessageId(null);
    } finally {
      setIsRegisteringInterest(false);
    }
  }

  async function handleActionComplete(direction: SwipeDirection) {
    const [current, ...remaining] = pets;
    if (!current) return;

    // Se for swipe para a direita e ainda não processamos este pet (não foi via botão)
    if (direction === "right" && lastActionMessageId !== current.id) {
      setActionMessage("Registrando interesse...");
      try {
        await registrarInteresse(current.id);
        setActionMessage(`Interesse registrado para ${current.name}!`);
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : "Nao foi possivel registrar o interesse.");
      }
    } else if (direction === "left") {
      setActionMessage(""); // Limpa mensagens anteriores no swipe para esquerda
    }

    setHistory((prev) => [current, ...prev].slice(0, 10)); // Mantem os ultimos 10 no historico
    setPets(remaining);
    setCardAction(null);
    if (remaining.length === 0) {
      setLoadStatus("empty");
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
      disabled={isRegisteringInterest}
      onAdopt={handleAdopt}
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
              {actionMessage && <p className="mt-3 text-center text-xs text-cyan-100">{actionMessage}</p>}
            </div>
            <MobileNavigation items={navigationItems} />
          </div>
        </div>
        <section className="animate-details-enter hidden max-w-[620px] space-y-12 md:block" aria-label="Detalhes e ações de adoção">
          <ProfileSummary pet={featuredPet} />
          <div className="animate-actions-enter">
            {actions}
            {actionMessage && <p className="mt-4 text-sm text-cyan-100">{actionMessage}</p>}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
