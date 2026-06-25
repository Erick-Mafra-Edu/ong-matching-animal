"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { HeartHandshake, ShieldCheck, User, X } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { navigationItems } from "@/data/adoption.mock";

import { registrarInteresse, type InteresseRegistro } from "@/lib/interessados";
import { fetchAnimalsPage, IMAGE_PRELOAD_WINDOW, isNoAnimalsAvailableMessage, preloadPrimaryAnimalPhotos, type AnimalsPageResponse } from "@/lib/discover";

import { buildAdoptionMessage, buildWhatsAppUrl, carregarOngSettings, type OngSettings } from "@/lib/ongSettings";
import type { AnimalListItem, DashboardStatus } from "@/types/adoption";
import { useDiscoverAccess } from "../Auth/DiscoverGate";
import { fetchDiscoverAccess } from "@/lib/onboarding";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DashboardState } from "./DashboardState";
import { MatchActions } from "./MatchActions";
import { MobileNavigation } from "./MobileNavigation";
import { PetPhotoCard } from "./PetPhotoCard";
import { ProfileSummary } from "./ProfileSummary";

interface AdoptionDashboardProps {
  initialPage?: AnimalsPageResponse;
  status?: DashboardStatus;
  tutorId?: string | null;
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

const desktopHeaderLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-6 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card-muted)] hover:text-[var(--color-text)]";

export function AdoptionDashboard({ initialPage, status = "ready", tutorId: tutorIdProp = null }: AdoptionDashboardProps) {
  const { resolvedTheme } = useTheme();
  const discoverAccess = useDiscoverAccess();
  const tutorId = tutorIdProp ?? discoverAccess.tutorId;
  const initialItems = initialPage?.items ?? [];
  const initialPagination = initialPage?.pagination ?? {
    limit: 0,
    offset: 0,
    nextOffset: 0,
    hasMore: true,
  };
  const initialDashboardStatus: DashboardStatus = status !== "ready"
    ? status
    : initialItems.length
      ? "ready"
      : initialPagination.hasMore
        ? "loading"
        : "empty";
  const [cardAction, setCardAction] = useState<CardAction | null>(null);
  const [pets, setPets] = useState<AnimalListItem[]>(initialItems);
  const [history, setHistory] = useState<AnimalListItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<DashboardStatus>(initialDashboardStatus);
  const [nextAnimalsOffset, setNextAnimalsOffset] = useState<number | null>(initialPagination.nextOffset);      
  const [hasMoreAnimals, setHasMoreAnimals] = useState(initialPagination.hasMore);
  const [isLoadingMoreAnimals, setIsLoadingMoreAnimals] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [pendingAdoptionId, setPendingAdoptionId] = useState<string | null>(null);
  const [contactDialog, setContactDialog] = useState<ContactDialogState | null>(null);
  const [onboardingOutdated, setOnboardingOutdated] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [lastActionMessageId, setLastActionMessageId] = useState<string | null>(null);
  const [, setOngSettings] = useState<OngSettings | null>(null);
  const [isThemeMounted, setIsThemeMounted] = useState(false);

  useEffect(() => {
    setIsThemeMounted(true);
  }, []);

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
    let isMounted = true;

    fetchDiscoverAccess(getSupabaseBrowserClient())
      .then((access) => {
        if (isMounted) {
          setOnboardingOutdated(access.onboarding_outdated === true);
          setUserIsAdmin(access.is_admin === true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOnboardingOutdated(false);
          setUserIsAdmin(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const mobileNavigationItems = useMemo(
    () => navigationItems.map((item) => (
      item.id === "profile" ? { ...item, notification: onboardingOutdated } : item
    )),
    [onboardingOutdated],
  );

  useEffect(() => {
    if (status !== "ready") {
      setLoadStatus(status);
      return;
    }

    let isMounted = true;
    setPets(initialItems);
    setHistory([]);
    setNextAnimalsOffset(initialPagination.nextOffset);
    setHasMoreAnimals(initialPagination.hasMore);

    if (!initialItems.length && !initialPagination.hasMore) {
      setLoadStatus("empty");
      return () => {
        isMounted = false;
      };
    }

    setLoadStatus(initialItems.length ? "ready" : "loading");

    fetchAnimalsPage(0, tutorId)
      .then((page) => {
        if (!isMounted) return;
        setPets(page.items);
        setNextAnimalsOffset(page.pagination.nextOffset);
        setHasMoreAnimals(page.pagination.hasMore);
        setLoadStatus(page.items.length ? "ready" : "empty");
      })
      .catch((error) => {
        if (!isMounted) return;
        setLoadStatus(error instanceof Error && isNoAnimalsAvailableMessage(error.message) ? "empty" : "error");
      });

    return () => {
      isMounted = false;
    };
  }, [initialItems, initialPagination.hasMore, initialPagination.nextOffset, status, tutorId]);

  const loadNextAnimalsPage = useCallback(async () => {
    if (isLoadingMoreAnimals || !hasMoreAnimals || nextAnimalsOffset === null) return;

    setIsLoadingMoreAnimals(true);
    try {
      const page = await fetchAnimalsPage(nextAnimalsOffset, tutorId);
      setPets((currentPets) => {
        const existingIds = new Set(currentPets.map((pet) => pet.id));
        const newItems = page.items.filter((pet) => !existingIds.has(pet.id));
        return [...currentPets, ...newItems];
      });
      setNextAnimalsOffset(page.pagination.nextOffset);
      setHasMoreAnimals(page.pagination.hasMore);
    } catch (error) {
      if (pets.length === 0) {
        setLoadStatus(error instanceof Error && isNoAnimalsAvailableMessage(error.message) ? "empty" : "error");
      }
    } finally {
      setIsLoadingMoreAnimals(false);
    }
  }, [hasMoreAnimals, isLoadingMoreAnimals, nextAnimalsOffset, pets.length, tutorId]);

  useEffect(() => {
    if (loadStatus !== "ready" || pets.length > 1) return;
    void loadNextAnimalsPage();
  }, [loadNextAnimalsPage, loadStatus, pets.length]);

  useEffect(() => {
    void preloadPrimaryAnimalPhotos(pets.slice(0, IMAGE_PRELOAD_WINDOW));
  }, [pets]);

  function renderContactDialog() {
    if (!contactDialog) return null;

    return (
      <AdoptionContactDialog
        dialog={contactDialog}
        onChange={setContactDialog}
        onClose={() => setContactDialog(null)}
      />
    );
  }
  const featuredPet = pets[0];
  const displayStatus = loadStatus !== "ready"
    ? loadStatus
    : featuredPet
      ? "ready"
      : (hasMoreAnimals || isLoadingMoreAnimals ? "loading" : "empty");
  const stateStatus: Exclude<DashboardStatus, "ready"> = displayStatus === "ready"
    ? "empty"
    : displayStatus;

  function requestCardAction(direction: SwipeDirection) {
    setCardAction({ direction, id: Date.now() });
  }

  async function openContactDialogForInterest(animal: AnimalListItem, interest: InteresseRegistro) {
    const settings = await carregarOngSettings().catch(() => null) as OngSettings | null;

    const interestLink = toAbsoluteInterestLink(interest.detail_url);
    const message = buildAdoptionMessage(settings?.adoption_message_template, animal.name, interestLink);       
    const email = settings?.contact_email?.trim() ?? "";
    const whatsappPhone = settings?.whatsapp_phone?.trim() || settings?.contact_phone?.trim() || "";

    setContactDialog({
      animalName: animal.name,
      emailUrl: email ? `mailto:${email}?subject=${encodeURIComponent(`Interesse em adotar ${animal.name}`)}&body=${encodeURIComponent(message)}` : "",
      interestLink,
      message,
      ongName: settings?.ong_name?.trim() || "ONG",
      whatsappUrl: buildWhatsAppUrl(whatsappPhone, message),
    });
  }

  async function handleAdopt() {
    if (!featuredPet || pendingAdoptionId) return;

    setPendingAdoptionId(featuredPet.id);
    setLastActionMessageId(featuredPet.id);
    setActionMessage("Registrando interesse...");

    try {
      const interest = await registrarInteresse(featuredPet.id);
      await openContactDialogForInterest(featuredPet, interest);
      setActionMessage(`Interesse registrado para ${featuredPet.name}!`);
      requestCardAction("right");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Não foi possível registrar o interesse.");
      setLastActionMessageId(null);
    } finally {
      setPendingAdoptionId(null);
    }
  }

  async function handleActionComplete(direction: SwipeDirection) {
    const [current, ...remaining] = pets;
    if (!current) return;

    if (direction === "right" && lastActionMessageId !== current.id) {
      setActionMessage("Registrando interesse...");
      try {
        setPendingAdoptionId(current.id);
        const interest = await registrarInteresse(current.id);
        await openContactDialogForInterest(current, interest);
        setActionMessage(`Interesse registrado para ${current.name}!`);
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : "Não foi possível registrar o interesse.");
      } finally {
        setPendingAdoptionId(null);
      }
    } else if (direction === "left") {
      setActionMessage("");
    }

    setHistory((prev) => [current, ...prev].slice(0, 10));
    setPets(remaining);
    setCardAction(null);
    if (remaining.length === 0 && !hasMoreAnimals) {
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
      disabled={Boolean(pendingAdoptionId)}
      onAdopt={handleAdopt}
      onReject={() => requestCardAction("left")}
      onUndo={history.length > 0 ? handleUndo : undefined}
    />
  );
  const desktopProfileTone = isThemeMounted && resolvedTheme === "light" ? "light" : "dark";

  return (
    <PageContainer>
      <header className="theme-panel fixed left-0 right-0 top-0 z-20 hidden border-b px-10 py-4 backdrop-blur md:block">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <Link className="text-sm font-semibold text-[var(--color-text)]" href="/discover">Match Pet</Link>
          <nav className="flex items-center gap-2" aria-label="Navegação desktop">
            <Link className={desktopHeaderLinkClass} href="/perfil">
              <User className="h-4 w-4" />
              Perfil
              {onboardingOutdated && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-rose-500 align-middle" />}
            </Link>
            <Link className={desktopHeaderLinkClass} href="/interesses">
              <HeartHandshake className="h-4 w-4" />
              Meus interesses
            </Link>
            {userIsAdmin && (
              <Link className={desktopHeaderLinkClass} href="/admin">
                <ShieldCheck className="h-4 w-4" />
                Painel administrativo
              </Link>
            )}
          </nav>
        </div>
      </header>
      {displayStatus === "ready" && featuredPet ? (
        <div className="grid w-full md:grid-cols-[minmax(360px,430px)_1fr] md:items-center md:gap-16 lg:gap-24">  
          <div>
            <PetPhotoCard
              action={cardAction}
              onActionComplete={handleActionComplete}
              pet={featuredPet}
            />
            <div className="md:hidden">
              <div className="theme-panel animate-actions-enter border-t px-5 py-3">
                {actions}
                {actionMessage && <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">{actionMessage}</p>}
              </div>
              <MobileNavigation items={mobileNavigationItems} />
            </div>
          </div>
          <section className="animate-details-enter hidden max-w-[620px] space-y-12 md:block" aria-label="Detalhes e ações de adoção">
            <ProfileSummary pet={featuredPet} tone={desktopProfileTone} />
            <div className="animate-actions-enter">
              {actions}
              {actionMessage && <p className="mt-4 text-sm text-[var(--color-text-muted)]">{actionMessage}</p>}
            </div>
          </section>
        </div>
      ) : (
        <div className="flex min-h-screen w-full flex-col pt-20 md:pt-24">
          <div className="flex-1">
            <DashboardState status={stateStatus} />
          </div>
          <div className="md:hidden">
            <MobileNavigation items={mobileNavigationItems} />
          </div>
        </div>
      )}
      {renderContactDialog()}
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--color-overlay)] px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="adoption-contact-title">
      <div className="theme-panel w-full max-w-lg rounded-lg border p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[var(--color-text)]" id="adoption-contact-title">Contato com a ONG</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{dialog.animalName} foi salvo nos seus interesses.</p>
          </div>
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card-muted)] text-[var(--color-text)] shadow-sm transition hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card)]" onClick={onClose} type="button" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Mensagem para {dialog.ongName}</span>
          <textarea
            className="form-control min-h-40 resize-y text-sm leading-6"
            value={dialog.message}
            onChange={(event) => onChange({ ...dialog, message: event.target.value })}
          />
        </label>

        <div className="mt-5 rounded-md border border-[var(--color-border)] bg-[var(--color-card-muted)] p-3 text-sm text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text)]">Link do interesse:</span> {dialog.interestLink}
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
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">Nenhum WhatsApp ou e-mail de contato foi configurado para a ONG.</p>
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
