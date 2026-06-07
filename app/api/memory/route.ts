import { NextResponse } from "next/server";
import { getMemorySnapshot } from "@/lib/eva";
import { fail } from "@/lib/server/guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid") ?? undefined;
  try {
    const snapshot = await getMemorySnapshot(uid);
    return NextResponse.json(snapshot);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "memory snapshot failed", 500);
  }
}
