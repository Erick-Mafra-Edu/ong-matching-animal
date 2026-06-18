"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileNavigation } from "@/components/features/AdoptionDashboard/MobileNavigation";
import { Badge } from "@/components/ui/Badge";
import { navigationItems } from "@/data/adoption.mock";
import { fetchAnimalFallbackPhoto } from "@/lib/animalFallbackPhoto";
import { listarMeusInteresses, type InteresseComAnimal } from "@/lib/interessados";

export default function MeusInteressesPage() {
  const router = useRouter();
  const [interesses, setInteresses] = useState<InteresseComAnimal[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const mobileNavigationItems = navigationItems.map((item) => ({ ...item, active: item.id === "interests" }));

  useEffect(() => {
    let mounted = true;

    listarMeusInteresses()
      .then((data) => {
        if (!mounted) return;
        setInteresses(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (!mounted) return;
        const errorMessage = error instanceof Error ? error.message : "Não foi possível carregar seus interesses.";
        if (errorMessage.includes("Sessão")) {
          router.replace("/login?redirect=/interesses");
          return;
        }
        setMessage(errorMessage);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0e0e12] px-4 pb-24 pt-6 text-white md:px-8 md:pb-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="text-sm font-semibold text-cyan-200 hover:text-cyan-100" href="/discover">Voltar para descobrir</Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Meus interesses</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Animais em que você demonstrou interesse e entrevistas vinculadas pela ONG.</p>
          </div>
          <nav className="hidden items-center gap-2 md:flex" aria-label="Navegação desktop">
            <Link className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-200 hover:text-cyan-100" href="/discover">Descobrir</Link>
            <Link className="rounded-md border border-cyan-200 bg-cyan-200 px-4 py-2 text-sm font-semibold text-slate-950" href="/interesses" aria-current="page">Meus interesses</Link>
          </nav>
        </header>

        {status === "loading" && (
          <div className="mt-6 grid gap-3">
            {[0, 1, 2].map((item) => <div className="h-32 animate-pulse rounded-md bg-white/10" key={item} />)}
          </div>
        )}

        {status === "error" && (
          <section className="mt-6 rounded-md border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-lg font-semibold text-white">Não foi possível carregar</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
          </section>
        )}

        {status === "ready" && !interesses.length && (
          <section className="mt-6 rounded-md border border-white/10 bg-white/[0.035] p-6 text-center">
            <h2 className="text-lg font-semibold text-white">Nenhum interesse registrado</h2>
            <p className="mt-2 text-sm text-slate-400">Quando você curtir um animal, ele aparecerá aqui.</p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100" href="/discover">Ver animais</Link>
          </section>
        )}

        {status === "ready" && interesses.length > 0 && (
          <div className="mt-6 grid gap-4">
            {interesses.map((interesse) => (
              <InterestCard interesse={interesse} key={interesse.uuid_registro} />
            ))}
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
        <MobileNavigation items={mobileNavigationItems} />
      </div>
    </main>
  );
}

function InterestCard({ interesse }: { interesse: InteresseComAnimal }) {
  const animal = interesse.animal ?? {};
  const initialPhotoUrl = animal.photoUrl || animal.photoUrls?.[0] || "";
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const nextSchedule = interesse.schedule?.[0];

  useEffect(() => {
    let mounted = true;
    if (initialPhotoUrl) {
      setPhotoUrl(initialPhotoUrl);
      return () => {
        mounted = false;
      };
    }

    fetchAnimalFallbackPhoto().then((fallbackUrl) => {
      if (mounted) setPhotoUrl(fallbackUrl);
    });

    return () => {
      mounted = false;
    };
  }, [initialPhotoUrl]);

  return (
    <article className="grid gap-4 rounded-md border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[180px_1fr]">
      <div className="overflow-hidden rounded-md bg-black/30">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`Foto de ${animal.name ?? "animal"}`} className="aspect-[4/3] h-full w-full object-cover md:aspect-square" src={photoUrl} />
        ) : (
          <div className="grid aspect-[4/3] animate-pulse place-items-center text-sm text-slate-500 md:aspect-square">Carregando foto...</div>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">{animal.name ?? "Animal"}</h2>
              <p className="mt-1 text-sm text-slate-400">{animal.species ?? "Espécie não informada"}</p>
            </div>
            <Badge>{interesse.has_schedule ? "Com entrevista" : "Aguardando agenda"}</Badge>
          </div>
          <p className="mt-3 text-sm text-slate-500">Interesse registrado em {formatDate(interesse.data_registro)}</p>
        </div>

        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          {nextSchedule ? (
            <>
              <p className="text-sm font-semibold text-white">{nextSchedule.title}</p>
              <p className="mt-1 text-sm text-slate-400">{formatTimeRange(nextSchedule.starts_at, nextSchedule.ends_at)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">A ONG ainda não vinculou uma entrevista para este interesse.</p>
          )}
        </div>

        <Link className="text-sm font-semibold text-cyan-200 hover:text-cyan-100" href={interesse.detail_url}>
          Ver detalhes
        </Link>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data não informada";
  return date.toLocaleDateString("pt-BR");
}

function formatTimeRange(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "horário não informado";

  return `${start.toLocaleDateString("pt-BR")} das ${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} às ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
