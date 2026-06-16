import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/session";

const cookieMaxAgeSeconds = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    accessToken?: string;
    refreshToken?: string;
  } | null;

  const accessToken = body?.accessToken?.trim() ?? "";
  const refreshToken = body?.refreshToken?.trim() ?? "";

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ message: "Informe accessToken e refreshToken." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    maxAge: cookieMaxAgeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  cookieStore.set(authCookieNames.accessToken, accessToken, cookieOptions);
  cookieStore.set(authCookieNames.refreshToken, refreshToken, cookieOptions);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.delete(authCookieNames.accessToken);
  cookieStore.delete(authCookieNames.refreshToken);

  return NextResponse.json({ ok: true });
}
