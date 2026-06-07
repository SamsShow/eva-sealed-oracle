import { NextResponse } from "next/server";
import { getScoreboard } from "@/lib/eva";
import { fail } from "@/lib/server/guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid") ?? undefined;
  try {
    const result = await getScoreboard(uid);
    return NextResponse.json(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "scoreboard failed", 500);
  }
}
