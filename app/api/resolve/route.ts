import { NextResponse } from "next/server";
import { resolveMatch } from "@/lib/eva";
import { checkSecret, fail, unauthorized } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!checkSecret(req)) return unauthorized();

  let body: {
    matchId?: string;
    uid?: string;
    manual?: { homeScore: number; awayScore: number };
  };
  try {
    body = await req.json();
  } catch {
    return fail("invalid JSON body");
  }
  if (!body.matchId) return fail("matchId is required");

  try {
    const result = await resolveMatch({
      matchId: body.matchId,
      uid: body.uid,
      manual: body.manual,
    });
    return NextResponse.json(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "resolve failed", 500);
  }
}
