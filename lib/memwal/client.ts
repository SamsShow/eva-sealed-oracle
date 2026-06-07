/**
 * EVA's Walrus Memory layer.
 *
 * A thin, server-only wrapper over the MemWal relayer client that gives EVA a
 * namespaced API: seal predictions, recall the context for a fixture (lessons,
 * dossiers, past calls, user bias), and store what she learns. Every memory is
 * a lead-sentence + JSON-tail (see ./format) so it embeds well AND reads back
 * deterministically.
 *
 * This module imports the MemWal SDK and reads secrets from env — it must only
 * be used from route handlers / server code, never from a client component.
 */

import { MemWal } from "@mysten-incubation/memwal";
import type {
  BiasRecord,
  DossierRecord,
  LessonRecord,
  PredictionRecord,
} from "../types";
import { parseMemoryRecord, toMemoryText } from "./format";

const DEFAULT_RELAYER = "https://relayer.memory.walrus.xyz";

/** Namespace scheme. Owner + namespace isolates / shares memory. */
export const NS = {
  predictions: "eva:predictions",
  lessons: "eva:lessons",
  dossier: (teamCode: string) => `eva:dossier:${teamCode.toUpperCase()}`,
  evaScoreboard: "eva:scoreboard",
  userPredictions: (uid: string) => `user:${uid}:predictions`,
  userBias: (uid: string) => `user:${uid}:bias`,
  userScoreboard: (uid: string) => `user:${uid}:scoreboard`,
} as const;

export function isConfigured(): boolean {
  return Boolean(process.env.MEMWAL_PRIVATE_KEY && process.env.MEMWAL_ACCOUNT_ID);
}

let cached: MemWal | null = null;

export function getClient(): MemWal {
  if (!isConfigured()) {
    throw new Error(
      "Walrus Memory not configured — set MEMWAL_PRIVATE_KEY and MEMWAL_ACCOUNT_ID",
    );
  }
  if (!cached) {
    cached = MemWal.create({
      key: process.env.MEMWAL_PRIVATE_KEY as string,
      accountId: process.env.MEMWAL_ACCOUNT_ID as string,
      serverUrl: process.env.MEMWAL_SERVER_URL || DEFAULT_RELAYER,
    });
  }
  return cached;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry wrapper — the SDK + relayer are beta, so transient failures happen. */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(baseDelayMs * 2 ** i);
    }
  }
  throw lastErr;
}

export interface SealResult {
  blobId: string;
  id: string;
  namespace: string;
}

async function rememberRecord(
  lead: string,
  record: object,
  namespace: string,
): Promise<SealResult> {
  const res = await withRetry(() =>
    getClient().rememberAndWait(toMemoryText(lead, record), namespace),
  );
  return { blobId: res.blob_id, id: res.id, namespace: res.namespace };
}

export interface RecalledRecord<T> {
  record: T;
  text: string;
  blobId: string;
  distance: number;
}

async function recallRecords<T>(
  query: string,
  namespace: string,
  opts: { topK?: number; maxDistance?: number } = {},
): Promise<RecalledRecord<T>[]> {
  const res = await withRetry(() =>
    getClient().recall({
      query,
      namespace,
      topK: opts.topK ?? 3,
      maxDistance: opts.maxDistance,
    }),
  );
  const out: RecalledRecord<T>[] = [];
  for (const m of res.results) {
    const record = parseMemoryRecord<T>(m.text);
    if (record) {
      out.push({ record, text: m.text, blobId: m.blob_id, distance: m.distance });
    }
  }
  return out;
}

// ── Lead-sentence builders (good prose for embeddings) ───────────────────────

function predictionLead(r: PredictionRecord): string {
  const who = r.by === "eva" ? "EVA" : "The user";
  return `${who} sealed a prediction for ${r.homeCode} vs ${r.awayCode}: pick ${r.pick} with confidence ${r.confidence}. ${r.reasoning}`;
}

function lessonLead(r: LessonRecord): string {
  return `Lesson from ${r.teams.join(" vs ")}: ${r.failureMode}. Rule: ${r.rule}. Adjustment: ${r.adjustment}. Applies when: ${r.appliesWhen}.`;
}

function dossierLead(r: DossierRecord): string {
  return `Scouting note on ${r.team}: ${r.note} (${r.tags.join(", ")}).`;
}

function biasLead(r: BiasRecord): string {
  return `User tendency: ${r.note} (${r.tendencies.join(", ")}).`;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function sealPrediction(record: PredictionRecord, uid?: string) {
  const namespace =
    record.by === "eva" ? NS.predictions : NS.userPredictions(uid as string);
  return rememberRecord(predictionLead(record), record, namespace);
}

export function storeLesson(record: LessonRecord) {
  return rememberRecord(lessonLead(record), record, NS.lessons);
}

export function updateDossier(record: DossierRecord) {
  return rememberRecord(dossierLead(record), record, NS.dossier(record.team));
}

export function storeBias(uid: string, record: BiasRecord) {
  return rememberRecord(biasLead(record), record, NS.userBias(uid));
}

export interface FixtureContext {
  lessons: RecalledRecord<LessonRecord>[];
  homeDossier: RecalledRecord<DossierRecord>[];
  awayDossier: RecalledRecord<DossierRecord>[];
  pastCalls: RecalledRecord<PredictionRecord>[];
  userBias: RecalledRecord<BiasRecord>[];
}

/** Recall everything EVA should consider before sealing a call on a fixture. */
export async function recallContext(args: {
  homeCode: string;
  awayCode: string;
  homeTeam: string;
  awayTeam: string;
  stage?: string;
  uid?: string;
}): Promise<FixtureContext> {
  const fixtureQuery = `${args.homeTeam} vs ${args.awayTeam} ${args.stage ?? ""} form strengths weaknesses ranking upsets`;
  const [lessons, homeDossier, awayDossier, pastCalls, userBias] =
    await Promise.all([
      recallRecords<LessonRecord>(fixtureQuery, NS.lessons, {
        topK: 3,
        maxDistance: 0.45,
      }),
      recallRecords<DossierRecord>(
        `${args.homeTeam} recent form weaknesses strengths`,
        NS.dossier(args.homeCode),
        { topK: 3 },
      ),
      recallRecords<DossierRecord>(
        `${args.awayTeam} recent form weaknesses strengths`,
        NS.dossier(args.awayCode),
        { topK: 3 },
      ),
      recallRecords<PredictionRecord>(
        `EVA past prediction ${args.homeTeam} ${args.awayTeam} outcome confidence`,
        NS.predictions,
        { topK: 5 },
      ),
      args.uid
        ? recallRecords<BiasRecord>(
            "user prediction tendencies bias",
            NS.userBias(args.uid),
            { topK: 2 },
          )
        : Promise.resolve([]),
    ]);
  return { lessons, homeDossier, awayDossier, pastCalls, userBias };
}

export function health() {
  return getClient().health();
}
