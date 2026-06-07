/**
 * Football data for the World Cup, from TheSportsDB — a real, free API that
 * needs no registration (the public test key "3" works; override with
 * THESPORTSDB_KEY). FIFA World Cup is league 4429, season 2026.
 *
 * Live scores populate `intHomeScore`/`intAwayScore` once matches kick off, so
 * one season fetch gives both fixtures and results. A manual override and a
 * small demo fallback keep the app usable if the API is unavailable.
 */

import type { Fixture, FinalResult } from "../types";

const KEY = process.env.THESPORTSDB_KEY || "3";
const LEAGUE_ID = process.env.THESPORTSDB_LEAGUE_ID || "4429";
const SEASON = process.env.THESPORTSDB_SEASON || "2026";
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

export function isConfigured(): boolean {
  return true; // the free test key always works
}

interface SdbEvent {
  idEvent: string;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strTimestamp: string | null;
  dateEvent: string | null;
  strTime: string | null;
  strStatus: string | null;
  strGroup: string | null;
  strStage: string | null;
  intRound: string | null;
}

// FIFA 3-letter codes for likely WC2026 nations (names as TheSportsDB returns
// them). Fallback derives a code from the name.
const NATION_CODES: Record<string, string> = {
  Argentina: "ARG", Brazil: "BRA", France: "FRA", England: "ENG", Spain: "ESP",
  Germany: "GER", Portugal: "POR", Netherlands: "NED", Belgium: "BEL",
  Croatia: "CRO", Italy: "ITA", Mexico: "MEX", USA: "USA", "United States": "USA",
  Canada: "CAN", Japan: "JPN", "South Korea": "KOR", Australia: "AUS",
  Morocco: "MAR", Senegal: "SEN", Ghana: "GHA", Nigeria: "NGA", Cameroon: "CMR",
  Egypt: "EGY", Tunisia: "TUN", Algeria: "ALG", "South Africa": "RSA",
  "Ivory Coast": "CIV", "Cote d'Ivoire": "CIV", Uruguay: "URU", Colombia: "COL",
  Ecuador: "ECU", Peru: "PER", Chile: "CHI", Paraguay: "PAR", Switzerland: "SUI",
  Denmark: "DEN", Sweden: "SWE", Poland: "POL", Serbia: "SRB",
  "Czech Republic": "CZE", Austria: "AUT", Ukraine: "UKR", Wales: "WAL",
  Scotland: "SCO", Turkey: "TUR", Greece: "GRE", Norway: "NOR",
  "Saudi Arabia": "KSA", Iran: "IRN", Qatar: "QAT", Iraq: "IRQ",
  "United Arab Emirates": "UAE", Jordan: "JOR", Uzbekistan: "UZB",
  "Bosnia-Herzegovina": "BIH", Hungary: "HUN", Romania: "ROU",
  "Costa Rica": "CRC", Panama: "PAN", Jamaica: "JAM", Honduras: "HON",
  "New Zealand": "NZL", "Cape Verde": "CPV", Curacao: "CUW",
};

function codeFor(name: string | null): string {
  if (!name) return "TBD";
  if (NATION_CODES[name]) return NATION_CODES[name];
  return name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "TBD";
}

const FINISHED = new Set(["FT", "AET", "PEN", "AOT", "Match Finished"]);
const LIVE = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INPLAY"]);

function normalizeStatus(s: string | null): Fixture["status"] {
  if (s && FINISHED.has(s)) return "FINISHED";
  if (s && LIVE.has(s)) return "IN_PLAY";
  return "SCHEDULED";
}

function kickoffIso(e: SdbEvent): string {
  if (e.strTimestamp) {
    // TheSportsDB timestamps are UTC without a zone marker.
    return e.strTimestamp.endsWith("Z") ? e.strTimestamp : `${e.strTimestamp}Z`;
  }
  return `${e.dateEvent ?? "2026-06-11"}T${e.strTime ?? "00:00:00"}Z`;
}

function toFixture(e: SdbEvent): Fixture {
  return {
    matchId: `WC-${e.idEvent}`,
    homeTeam: e.strHomeTeam ?? "TBD",
    homeCode: codeFor(e.strHomeTeam),
    awayTeam: e.strAwayTeam ?? "TBD",
    awayCode: codeFor(e.strAwayTeam),
    kickoff: kickoffIso(e),
    stage:
      e.strGroup ||
      e.strStage ||
      (e.intRound ? `Matchday ${e.intRound}` : undefined),
    status: normalizeStatus(e.strStatus),
  };
}

async function fetchSeason(): Promise<SdbEvent[]> {
  const res = await fetch(
    `${BASE}/eventsseason.php?id=${LEAGUE_ID}&s=${SEASON}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`TheSportsDB ${res.status}`);
  const data = (await res.json()) as { events: SdbEvent[] | null };
  return data.events ?? [];
}

// ── Manual overrides (ephemeral; resolve persists graded outcomes to memory) ──
const manualResults = new Map<string, FinalResult>();

export function setManualResult(result: Omit<FinalResult, "source">): FinalResult {
  const full: FinalResult = { ...result, source: "manual" };
  manualResults.set(full.matchId, full);
  return full;
}

export function getManualResult(matchId: string): FinalResult | null {
  return manualResults.get(matchId) ?? null;
}

export async function getFixtures(): Promise<Fixture[]> {
  try {
    const events = await fetchSeason();
    const fixtures = events.map(toFixture);
    return fixtures.length ? fixtures : demoFixtures();
  } catch (err) {
    console.warn("[football] season fetch failed:", err);
    return demoFixtures();
  }
}

export async function getFixture(matchId: string): Promise<Fixture | null> {
  const fixtures = await getFixtures();
  return fixtures.find((f) => f.matchId === matchId) ?? null;
}

export async function getResult(matchId: string): Promise<FinalResult | null> {
  const manual = getManualResult(matchId);
  if (manual) return manual;

  const id = matchId.replace(/^WC-/, "");
  try {
    const events = await fetchSeason();
    const e = events.find((x) => x.idEvent === id);
    if (!e || normalizeStatus(e.strStatus) !== "FINISHED") return null;
    if (e.intHomeScore == null || e.intAwayScore == null) return null;
    return {
      matchId,
      homeScore: Number(e.intHomeScore),
      awayScore: Number(e.intAwayScore),
      source: "api",
    };
  } catch (err) {
    console.warn(`[football] result fetch failed for ${matchId}:`, err);
    return null;
  }
}

/** Fallback fixtures if the API is unreachable. */
function demoFixtures(): Fixture[] {
  const mk = (
    n: number, ht: string, hc: string, at: string, ac: string, ko: string, stage: string,
  ): Fixture => ({
    matchId: `WC-DEMO-${n}`,
    homeTeam: ht, homeCode: hc, awayTeam: at, awayCode: ac,
    kickoff: ko, stage, status: "SCHEDULED",
  });
  return [
    mk(1, "Brazil", "BRA", "Croatia", "CRO", "2026-06-12T18:00:00Z", "Group C"),
    mk(2, "Spain", "ESP", "Morocco", "MAR", "2026-06-13T18:00:00Z", "Group E"),
    mk(3, "Argentina", "ARG", "Mexico", "MEX", "2026-06-14T18:00:00Z", "Group D"),
  ];
}
