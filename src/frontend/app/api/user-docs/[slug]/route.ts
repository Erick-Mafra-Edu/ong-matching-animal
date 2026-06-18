import { NextResponse } from "next/server";
import { getUserDocBySlug } from "@/lib/userDocs";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const doc = await getUserDocBySlug(slug);

  if (!doc) {
    return NextResponse.json({ message: "Documento nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ doc });
}
