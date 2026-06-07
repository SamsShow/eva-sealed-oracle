/**
 * Football data for the World Cup.
 *
 * Primary source: football-data.org free tier (competition code `WC`,
 * 10 req/min). Because a free tier can lag during live matches, we support a
 * manual override (the user / demo can supply a result directly) and a soft
 * fallback fetch for fixtures. Everything is normalized to the shared
 * `Fixture` / `FinalResult` shapes.
 *
 * Server-only: reads FOOTBALL_DATA_API_KEY.
 */

import type { Fixture, FinalResult } from "../types";

const FD_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";

export function isConfigured(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY);
}

// ── football-data.org wire shapes (only the fields we use) ───────────────────

interface FdTeam {
  name: string | null;
  tla: string | null;
}
interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage?: string;
  group?: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
}

function normalizeStatus(s: string): Fixture["status"] {
  if (s === "FINISHED" || s === "AWARDED") return "FINISHED";
  if (s === "IN_PLAY" || s === "PAUSED") return "IN_PLAY";
  return "SCHEDULED";
}

function codeFor(team: FdTeam): string {
  if (team.tla) return team.tla.toUpperCase();
  return (team.name ?? "TBD").slice(0, 3).toUpperCase();
}

function toFixture(m: FdMatch): Fixture {
  return {
    matchId: `WC-${m.id}`,
    homeTeam: m.homeTeam.name ?? "TBD",
    homeCode: codeFor(m.homeTeam),
    awayTeam: m.awayTeam.name ?? "TBD",
    awayCode: codeFor(m.awayTeam),
    kickoff: m.utcDate,
    stage: m.group ?? m.stage,
    status: normalizeStatus(m.status),
  };
}

async function fdRequest<T>(path: string): Promise<T> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY not set");
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { "X-Auth-Token": key },
    // Fixtures change slowly; cache for a minute to respect the rate limit.
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${path} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

/** In-process manual overrides. Note: ephemeral in serverless — the resolve
 *  route persists the graded outcome to memory, which is the durable record. */
const manualResults = new Map<string, FinalResult>();

export function setManualResult(result: Omit<FinalResult, "source">): FinalResult {
  const full: FinalResult = { ...result, source: "manual" };
  manualResults.set(full.matchId, full);
  return full;
}

export function getManualResult(matchId: string): FinalResult | null {
  return manualResults.get(matchId) ?? null;
}

/** A few fixtures so the full loop is usable before the football key is wired.
 *  Resolve these manually (enter the score). */
function demoFixtures(): Fixture[] {
  const mk = (
    n: number,
    homeTeam: string,
    homeCode: string,
    awayTeam: string,
    awayCode: string,
    kickoff: string,
    stage: string,
  ): Fixture => ({
    matchId: `WC-DEMO-${n}`,
    homeTeam,
    homeCode,
    awayTeam,
    awayCode,
    kickoff,
    stage,
    status: "SCHEDULED",
  });
  return [
    mk(1, "Brazil", "BRA", "Croatia", "CRO", "2026-06-12T18:00:00Z", "Group C"),
    mk(2, "Spain", "ESP", "Morocco", "MAR", "2026-06-13T18:00:00Z", "Group E"),
    mk(3, "Argentina", "ARG", "Mexico", "MEX", "2026-06-14T18:00:00Z", "Group D"),
  ];
}

/** Fetch all WC fixtures. Falls back to FOOTBALL_FALLBACK_URL (e.g. an
 *  openfootball worldcup JSON) and finally to demo fixtures. */
export async function getFixtures(): Promise<Fixture[]> {
  if (!isConfigured()) return demoFixtures();
  try {
    const data = await fdRequest<{ matches: FdMatch[] }>(
      `/competitions/${COMPETITION}/matches`,
    );
    return data.matches.map(toFixture);
  } catch (err) {
    console.warn("[football] primary fixtures fetch failed:", err);
    return fallbackFixtures();
  }
}

/** Find a single fixture by id (from the fixtures list). */
export async function getFixture(matchId: string): Promise<Fixture | null> {
  const fixtures = await getFixtures();
  return fixtures.find((f) => f.matchId === matchId) ?? null;
}

/** Resolve a single fixture's final result. Manual override wins. */
export async function getResult(matchId: string): Promise<FinalResult | null> {
  const manual = getManualResult(matchId);
  if (manual) return manual;

  const id = matchId.replace(/^WC-/, "");
  try {
    const m = await fdRequest<FdMatch>(`/matches/${id}`);
    const ft = m.score?.fullTime;
    if (normalizeStatus(m.status) !== "FINISHED" || ft?.home == null || ft?.away == null) {
      return null;
    }
    return { matchId, homeScore: ft.home, awayScore: ft.away, source: "api" };
  } catch (err) {
    console.warn(`[football] result fetch failed for ${matchId}:`, err);
    return null;
  }
}

async function fallbackFixtures(): Promise<Fixture[]> {
  const url = process.env.FOOTBALL_FALLBACK_URL;
  if (!url) return [];
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { matches?: FdMatch[] };
    return (data.matches ?? []).map(toFixture);
  } catch {
    return [];
  }
}
