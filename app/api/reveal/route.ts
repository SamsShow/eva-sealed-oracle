import { NextResponse } from "next/server";
import { revealMatch } from "@/lib/eva";
import { fail } from "@/lib/server/guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");
  const uid = searchParams.get("uid") ?? undefined;
  if (!matchId) return fail("matchId is required");

  try {
    const result = await revealMatch(matchId, uid);
    return NextResponse.json(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "reveal failed", 500);
  }
}
