import { promises as fs } from "fs";
import path from "path";

const userDocsDirectory = path.resolve(process.cwd(), "..", "..", "docs", "user");

const userDocRelations: Record<string, string[]> = {
  ADMIN_MATCHING_RULES_GUIDE: ["ADMIN_ONBOARDING_QUESTIONS_GUIDE"],
  ADMIN_ONBOARDING_QUESTIONS_GUIDE: ["ADMIN_MATCHING_RULES_GUIDE"],
};

export interface UserDocHeading {
  id: string;
  level: 2 | 3;
  title: string;
}

export interface UserDocSummary {
  slug: string;
  title: string;
  fileName: string;
  excerpt: string;
  relatedSlugs: string[];
}

export interface UserDoc extends UserDocSummary {
  content: string;
  headings: UserDocHeading[];
}

export async function listUserDocs(): Promise<UserDocSummary[]> {
  const files = await fs.readdir(userDocsDirectory, { withFileTypes: true });

  const markdownFiles = files
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const docs = await Promise.all(markdownFiles.map(async (fileName) => {
    const content = await fs.readFile(path.join(userDocsDirectory, fileName), "utf8");
    return buildSummary(fileName, content);
  }));

  return docs;
}

export async function getUserDocBySlug(slug: string): Promise<UserDoc | null> {
  const safeSlug = sanitizeSlug(slug);
  if (!safeSlug) return null;

  const fileName = `${safeSlug}.md`;
  const filePath = path.join(userDocsDirectory, fileName);

  try {
    const content = await fs.readFile(filePath, "utf8");
    return {
      ...buildSummary(fileName, content),
      content,
      headings: extractHeadings(content),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function buildSummary(fileName: string, content: string): UserDocSummary {
  const slug = fileName.replace(/\.md$/i, "");
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "").trim() || humanizeSlug(slug);
  const excerpt = lines.find((line) => line && !line.startsWith("#")) || "Documento de apoio para usuarios da plataforma.";

  return {
    slug,
    title,
    fileName,
    excerpt,
    relatedSlugs: userDocRelations[slug] ?? [],
  };
}

function extractHeadings(content: string): UserDocHeading[] {
  const headings: UserDocHeading[] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const match = /^(##|###)\s+(.+?)\s*$/.exec(line.trim());
    if (!match) continue;

    const level = match[1] === "##" ? 2 : 3;
    const title = match[2].trim();
    headings.push({
      id: slugifyHeading(title),
      level,
      title,
    });
  }

  return headings;
}

function sanitizeSlug(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9_-]+$/.test(normalized) ? normalized : "";
}

function humanizeSlug(slug: string) {
  return slug
    .toLowerCase()
    .split(/[_-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function slugifyHeading(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
