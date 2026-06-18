import { NextResponse } from "next/server";
import { listUserDocs } from "@/lib/userDocs";

export async function GET() {
  const docs = await listUserDocs();
  return NextResponse.json({ docs });
}
