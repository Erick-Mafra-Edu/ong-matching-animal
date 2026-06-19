import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { getUserDocBySlug, listUserDocs, slugifyHeading } from "@/lib/userDocs";

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
  const [doc, allDocs] = await Promise.all([
    getUserDocBySlug(slug),
    listUserDocs(),
  ]);

  if (!doc) notFound();

  const relatedDocs = allDocs.filter((item) => doc.relatedSlugs.includes(item.slug));

  return (
    <main className="min-h-screen bg-surface-bg px-4 py-8 text-surface-text sm:px-6 sm:py-10 lg:px-16 lg:py-12">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-8">
        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-text-soft)]">Documentos</p>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--color-field-border)] px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-text)] transition hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card-muted)]"
                href="/docs/user"
              >
                Inicio
              </Link>
            </div>
            <nav className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0" aria-label="Menu lateral de documentacao">
              {allDocs.map((item) => {
                const isActive = item.slug === doc.slug;

                return (
                  <Link
                    className={`block min-w-[220px] rounded-2xl border px-4 py-3 text-sm font-semibold transition lg:min-w-0 ${
                      isActive
                        ? "border-[var(--color-field-border-focus)] bg-[var(--color-card-muted)] text-[var(--color-text)]"
                        : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:border-[var(--color-field-border-focus)] hover:text-[var(--color-text)]"
                    }`}
                    href={`/docs/user/${item.slug}`}
                    key={item.slug}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          {doc.headings.length > 0 && (
            <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-text-soft)]">Topicos</p>
              <nav className="mt-4 space-y-2" aria-label="Topicos do documento">
                {doc.headings.map((heading) => (
                  <a
                    className={`block rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--color-card-muted)] ${
                      heading.level === 3
                        ? "ml-4 text-[var(--color-text-soft)]"
                        : "font-semibold text-[var(--color-text-muted)]"
                    }`}
                    href={`#${heading.id}`}
                    key={`${heading.level}-${heading.id}`}
                  >
                    {heading.title}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {relatedDocs.length > 0 && (
            <div className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-text-soft)]">Relacionados</p>
              <div className="mt-4 space-y-2">
                {relatedDocs.map((item) => (
                  <Link
                    className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-muted)] px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-field-border-focus)]"
                    href={`/docs/user/${item.slug}`}
                    key={item.slug}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--color-field-border)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text)] transition hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card-muted)] sm:w-auto"
              href="/docs/user"
            >
              Voltar para o inicio da documentacao
            </Link>
            <a
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--color-field-border)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text)] transition hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card-muted)] sm:w-auto"
              href={`/api/user-docs/${doc.slug}`}
              rel="noreferrer"
              target="_blank"
            >
              Ver JSON do endpoint
            </a>
          </div>

          <article className="rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm sm:p-10">
            <div className="markdown-doc">
            <ReactMarkdown
              components={{
                h2: ({ children }) => <h2 id={slugifyHeading(flattenMarkdownText(children))}>{children}</h2>,
                h3: ({ children }) => <h3 id={slugifyHeading(flattenMarkdownText(children))}>{children}</h3>,
              }}
            >
              {doc.content}
            </ReactMarkdown>
            </div>
            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--color-field-border)] px-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-text)] transition hover:border-[var(--color-field-border-focus)] hover:bg-[var(--color-card-muted)] sm:w-auto"
                href="/docs/user"
              >
                Voltar para o inicio da documentacao
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function flattenMarkdownText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(flattenMarkdownText).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    return flattenMarkdownText((children as { props?: { children?: ReactNode } }).props?.children ?? "");
  }

  return "";
}
