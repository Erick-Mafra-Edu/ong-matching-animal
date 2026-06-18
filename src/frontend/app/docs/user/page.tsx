import Link from "next/link";
import type { Metadata } from "next";
import { listUserDocs } from "@/lib/userDocs";

export const metadata: Metadata = {
  title: "Documentacao Do Usuario | Match Pet",
  description: "Guias operacionais para uso da plataforma Match Pet.",
};

export default async function UserDocsPage() {
  const docs = await listUserDocs();

  return (
    <main className="min-h-screen bg-surface-bg px-6 py-12 text-surface-text sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-text-soft)]">Documentos</p>
            <nav className="mt-4 space-y-2" aria-label="Documentacao do usuario">
              {docs.map((doc) => (
                <Link
                  className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-muted)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card)]"
                  href={`/docs/user/${doc.slug}`}
                  key={doc.slug}
                >
                  {doc.title}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <section className="space-y-8">
          <header className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-7 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-text-soft)]">Centro do Usuario</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-[var(--color-text)] sm:text-5xl">Janela de documentacao</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-muted)]">
              Guias operacionais para administradores e usuarios internos da plataforma, com navegacao lateral, topicos por pagina e links para materiais relacionados.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            {docs.map((doc) => (
              <Link
                className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-field-border-focus)] hover:shadow-lg"
                href={`/docs/user/${doc.slug}`}
                key={doc.slug}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">{doc.fileName}</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text)]">{doc.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{doc.excerpt}</p>
                <span className="mt-5 inline-flex items-center rounded-full border border-[var(--color-field-border)] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text)]">
                  Abrir documento
                </span>
              </Link>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
