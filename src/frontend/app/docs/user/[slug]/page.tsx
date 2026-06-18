import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { getUserDocBySlug, listUserDocs } from "@/lib/userDocs";

interface UserDocDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const docs = await listUserDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: UserDocDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getUserDocBySlug(slug);

  if (!doc) {
    return {
      title: "Documento nao encontrado | Match Pet",
    };
  }

  return {
    title: `${doc.title} | Match Pet`,
    description: doc.excerpt,
  };
}

export default async function UserDocDetailPage({ params }: UserDocDetailPageProps) {
  const { slug } = await params;
  const doc = await getUserDocBySlug(slug);

  if (!doc) notFound();

  return (
    <main className="min-h-screen bg-surface-bg px-6 py-12 text-surface-text sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-field-border)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text)] transition hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card-muted)]"
            href="/docs/user"
          >
            Voltar para documentos
          </Link>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-field-border)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text)] transition hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card-muted)]"
            href={`/api/user-docs/${doc.slug}`}
            rel="noreferrer"
            target="_blank"
          >
            Ver JSON do endpoint
          </a>
        </div>

        <article className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm sm:p-10">
          <ReactMarkdown className="markdown-doc">{doc.content}</ReactMarkdown>
        </article>
      </div>
    </main>
  );
}
