import { promises as fs } from "fs";
import path from "path";

const userDocsDirectory = path.resolve(process.cwd(), "..", "..", "docs", "user");

export interface UserDocSummary {
  slug: string;
  title: string;
  fileName: string;
  excerpt: string;
}

export interface UserDoc extends UserDocSummary {
  content: string;
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
  };
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
