"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { carregarInteresse } from "@/lib/interessados";

type DetailRecord = Record<string, unknown>;

export default function InteresseDetalhePage() {
  const params = useParams<{ uuid_registro: string }>();
  const router = useRouter();
  const uuidRegistro = params.uuid_registro;
  const [record, setRecord] = useState<DetailRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    carregarInteresse(uuidRegistro)
      .then((data) => {
        if (!mounted) return;
        setRecord(data);
        setStatus("ready");
      })
      .catch((error) => {
        if (!mounted) return;
        const errorMessage = error instanceof Error ? error.message : "Nao foi possivel carregar o registro.";
        if (errorMessage.includes("Sessao")) {
          router.replace(`/login?redirect=/interessados/${encodeURIComponent(uuidRegistro)}`);
          return;
        }
        setMessage(errorMessage);
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [router, uuidRegistro]);

  const tutor = useMemo(() => asObject(record?.tutor), [record]);
  const animal = useMemo(() => asObject(record?.animal), [record]);
  const animalMatchingFields = getMatchingFields(asObject(animal.custom_fields));
  const tutorMatchingFields = getMatchingFields(asObject(tutor.custom_fields));
  const photoUrl = Array.isArray(animal.photoUrls) ? String(animal.photoUrls[0] ?? "") : String(animal.photoUrl ?? "");
  const tutorName = String(tutor.name ?? "Tutor");
  const animalName = String(animal.name ?? "Animal");

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0e0e12] px-4 text-cyan-100">
        <p className="animate-loading-pulse text-sm uppercase tracking-[0.25em]">Carregando interesse...</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0e0e12] px-4 text-white">
        <section className="w-full max-w-xl rounded-md border border-white/10 bg-white/[0.035] p-6">
          <h1 className="text-xl font-semibold text-white">Registro de interesse</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
          <Link className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100" href="/admin">Voltar ao painel</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0e0e12] px-4 py-6 text-white md:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan-200">Registro de interesse</p>
            <h1 className="text-2xl font-semibold text-white">{tutorName} quer adotar {animalName}</h1>
            <p className="mt-2 text-sm text-slate-400">{formatDate(record?.data_registro)}</p>
          </div>
          <Link className="text-sm font-semibold text-slate-300 hover:text-white" href="/admin">Voltar ao painel</Link>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <ComparisonPanel
            eyebrow="Tutor"
            fields={[
              ["Nome", tutor.name],
              ["Cadastro", formatDate(tutor.created_at)],
            ]}
            title={tutorName}
          >
            <MatchingInfoGrid fields={tutorMatchingFields} />
          </ComparisonPanel>

          <ComparisonPanel
            eyebrow="Pet"
            fields={[
              ["Nome", animal.name],
              ["Especie", animal.species],
              ["Cadastro", formatDate(animal.created_at)],
            ]}
            title={animalName}
          >
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`Foto de ${String(animal.name ?? "animal")}`} className="mb-4 aspect-[4/3] w-full rounded-md object-cover" src={photoUrl} />
            )}
            <div className="mb-4 flex flex-wrap gap-2">
              {Array.isArray(animal.traits) && animal.traits.map((trait) => <Badge key={String(trait)}>{String(trait)}</Badge>)}
            </div>
            <MatchingInfoGrid fields={animalMatchingFields} />
          </ComparisonPanel>
        </div>
      </div>
    </main>
  );
}

function ComparisonPanel({
  children,
  eyebrow,
  fields,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  fields: Array<[string, unknown]>;
  title: string;
}) {
  return (
    <section className="rounded-md border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase text-cyan-200">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div className="rounded-md border border-white/10 bg-black/20 p-3" key={label}>
            <dt className="text-[11px] uppercase text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-sm text-slate-100">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MatchingInfoGrid({ fields }: { fields: Record<string, unknown> }) {
  const entries = Object.entries(fields);

  if (!entries.length) return <p className="text-sm text-slate-500">Sem informacoes de matching.</p>;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-100">Informacoes de matching</h3>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div className="rounded-md bg-white/[0.045] p-3" key={key}>
            <dt className="text-[11px] uppercase text-slate-500">{humanize(key)}</dt>
            <dd className="mt-1 break-words text-sm text-slate-200">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getMatchingFields(fields: Record<string, unknown>) {
  const hiddenKeys = new Set(["onboarding_complete", "verified", "verificado", "traits", "caracteristicas"]);

  return Object.entries(fields).reduce<Record<string, unknown>>((matchingFields, [key, value]) => {
    if (hiddenKeys.has(key)) return matchingFields;
    if (value === null || value === undefined || value === "") return matchingFields;
    matchingFields[key] = value;
    return matchingFields;
  }, {});
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "sem valor";
  return new Date(value).toLocaleString("pt-BR");
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  if (value === null || value === undefined || value === "") return "sem valor";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanize(value: string) {
  return value.split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
