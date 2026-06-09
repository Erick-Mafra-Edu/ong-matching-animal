"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { navigationItems } from "@/data/adoption.mock";
import { backendApiUrl } from "@/lib/backend";
import { fetchAnimalFallbackPhoto } from "@/lib/animalFallbackPhoto";
import { registrarInteresse } from "@/lib/interessados";
import { buildAdoptionMessage, buildWhatsAppUrl, carregarOngSettings, type OngSettings } from "@/lib/ongSettings";
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

interface ContactDialogState {
  animalName: string;
  emailUrl: string;
  interestLink: string;
  message: string;
  ongName: string;
  whatsappUrl: string;
}

async function withFallbackPhoto(animal: AnimalListItem): Promise<AnimalListItem> {
  if (animal.photoUrl || animal.photoUrls?.length) return animal;

  const photoUrl = await fetchAnimalFallbackPhoto();
  return { ...animal, photoUrl, photoUrls: [photoUrl] };
}

export function AdoptionDashboard({ status = "ready" }: AdoptionDashboardProps) {
  const [cardAction, setCardAction] = useState<CardAction | null>(null);
  const [pets, setPets] = useState<AnimalListItem[]>([]);
  const [history, setHistory] = useState<AnimalListItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<DashboardStatus>(status === "ready" ? "loading" : status);
  const [actionMessage, setActionMessage] = useState("");
  const [isRegisteringInterest, setIsRegisteringInterest] = useState(false);
  const [ongSettings, setOngSettings] = useState<OngSettings | null>(null);
  const [contactDialog, setContactDialog] = useState<ContactDialogState | null>(null);

  const [lastActionMessageId, setLastActionMessageId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    carregarOngSettings()
      .then((settings) => {
        if (isMounted) setOngSettings(settings);
      })
      .catch(() => {
        if (isMounted) setOngSettings(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
        return Promise.all(animals.map(withFallbackPhoto));
      })
      .then((availableAnimals) => {
        if (!isMounted) return;
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
      const interest = await registrarInteresse(featuredPet.id);
      const settings = ongSettings ?? await carregarOngSettings().catch(() => null);
      if (settings && !ongSettings) setOngSettings(settings);

      const interestLink = toAbsoluteInterestLink(interest.detail_url);
      const message = buildAdoptionMessage(settings?.adoption_message_template, featuredPet.name, interestLink);
      const email = settings?.contact_email?.trim() ?? "";
      const whatsappPhone = settings?.whatsapp_phone?.trim() || settings?.contact_phone?.trim() || "";

      setContactDialog({
        animalName: featuredPet.name,
        emailUrl: email ? `mailto:${email}?subject=${encodeURIComponent(`Interesse em adotar ${featuredPet.name}`)}&body=${encodeURIComponent(message)}` : "",
        interestLink,
        message,
        ongName: settings?.ong_name?.trim() || "ONG",
        whatsappUrl: buildWhatsAppUrl(whatsappPhone, message),
      });
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
          <nav className="flex items-center gap-2" aria-label="Navegação desktop">
            <Link className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-200 hover:text-cyan-100" href="/interesses">
              Meus interesses
            </Link>
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
      {contactDialog && (
        <AdoptionContactDialog
          dialog={contactDialog}
          onChange={setContactDialog}
          onClose={() => setContactDialog(null)}
        />
      )}
    </PageContainer>
  );
}

function toAbsoluteInterestLink(detailUrl: string) {
  if (/^https?:\/\//i.test(detailUrl)) return detailUrl;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${detailUrl.startsWith("/") ? detailUrl : `/${detailUrl}`}`;
}

interface AdoptionContactDialogProps {
  dialog: ContactDialogState;
  onChange: (dialog: ContactDialogState) => void;
  onClose: () => void;
}

function AdoptionContactDialog({ dialog, onChange, onClose }: AdoptionContactDialogProps) {
  const emailUrl = dialog.emailUrl
    ? replaceMailtoBody(dialog.emailUrl, dialog.message)
    : "";
  const whatsappUrl = dialog.whatsappUrl
    ? replaceWhatsAppText(dialog.whatsappUrl, dialog.message)
    : "";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="adoption-contact-title">
      <div className="w-full max-w-lg rounded-lg border border-white/12 bg-[#141419] p-5 text-cyan-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black" id="adoption-contact-title">Contato com a ONG</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{dialog.animalName} foi salvo nos seus interesses.</p>
          </div>
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-xl text-slate-300 transition hover:border-cyan-200 hover:text-cyan-100" onClick={onClose} type="button" aria-label="Fechar">
            ×
          </button>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Mensagem para {dialog.ongName}</span>
          <textarea
            className="form-control min-h-40 resize-y text-sm leading-6"
            value={dialog.message}
            onChange={(event) => onChange({ ...dialog, message: event.target.value })}
          />
        </label>

        <div className="mt-5 rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-300">
          <span className="font-semibold text-cyan-100">Link do interesse:</span> {dialog.interestLink}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {whatsappUrl && (
            <a className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-cyan-200 px-5 text-xs font-bold uppercase tracking-wide text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-100" href={whatsappUrl} target="_blank" rel="noreferrer">
              Enviar WhatsApp
            </a>
          )}
          {emailUrl && (
            <a className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-amber-500 px-5 text-xs font-bold uppercase tracking-wide text-amber-500 transition hover:-translate-y-0.5 hover:bg-amber-500/10" href={emailUrl}>
              Enviar e-mail
            </a>
          )}
          {!whatsappUrl && !emailUrl && (
            <p className="text-sm leading-6 text-slate-400">Nenhum WhatsApp ou e-mail de contato foi configurado para a ONG.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function replaceWhatsAppText(url: string, message: string) {
  const parsed = new URL(url);
  parsed.searchParams.set("text", message);
  return parsed.toString();
}

function replaceMailtoBody(url: string, message: string) {
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("body", message);
  return `${base}?${params.toString()}`;
}
