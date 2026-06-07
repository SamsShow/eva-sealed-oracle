import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/football/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const fixtures = await getFixtures();
    return NextResponse.json({ fixtures });
  } catch (e) {
    return NextResponse.json({
      fixtures: [],
      error: e instanceof Error ? e.message : "failed to load fixtures",
    });
  }
}
