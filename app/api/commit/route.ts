import { NextResponse } from "next/server";
import { commitMatch } from "@/lib/eva";
import { fail } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: {
    matchId?: string;
    uid?: string;
    user?: { pick: "HOME" | "DRAW" | "AWAY"; confidence: number; reasoning?: string };
  };
  try {
    body = await req.json();
  } catch {
    return fail("invalid JSON body");
  }
  if (!body.matchId || !body.uid) return fail("matchId and uid are required");

  try {
    const result = await commitMatch({
      matchId: body.matchId,
      uid: body.uid,
      user: body.user,
    });
    return NextResponse.json(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "commit failed", 500);
  }
}
