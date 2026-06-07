/**
 * EVA's Brain — server orchestration of the 4-step loop:
 * COMMIT (seal) → RESOLVE (grade) → LEARN (lesson) → APPLY (next commit recalls).
 * Route handlers stay thin and call these.
 */

import { buildCommitment, generateNonce, verifyCommitment } from "./commit";
import { aggregateScoreboard, gradePrediction, resultOutcome } from "./grade";
import { predict } from "./ai/predict";
import { postmortem } from "./ai/postmortem";
import {
  getFixture,
  getResult,
  setManualResult,
} from "./football/client";
import {
  findPrediction,
  NS,
  recallContext,
  recallOutcomes,
  recallRaw,
  recordLearnings,
  sealPrediction,
} from "./memwal/client";
import type { RecalledRecord } from "./memwal/client";
import type {
  DossierRecord,
  Fixture,
  FinalResult,
  LessonRecord,
  Outcome,
  OutcomeRecord,
  PredictionRecord,
  Predictor,
} from "./types";

const nowIso = () => new Date().toISOString();

/** The fields a commitment binds (proof EVA/the user can't rewrite these). */
function commitmentCore(r: {
  matchId: string;
  by: Predictor;
  pick: Outcome;
  confidence: number;
  reasoning: string;
}) {
  return {
    matchId: r.matchId,
    by: r.by,
    pick: r.pick,
    confidence: r.confidence,
    reasoning: r.reasoning,
  };
}

function buildPredictionRecord(args: {
  fixture: Fixture;
  by: Predictor;
  pick: Outcome;
  confidence: number;
  reasoning: string;
  appliedLessons: string[];
  sealedAt: string;
}): PredictionRecord {
  const nonce = generateNonce();
  const base = {
    matchId: args.fixture.matchId,
    by: args.by,
    pick: args.pick,
    confidence: args.confidence,
    reasoning: args.reasoning,
  };
  return {
    type: "prediction",
    ...base,
    homeCode: args.fixture.homeCode,
    awayCode: args.fixture.awayCode,
    appliedLessons: args.appliedLessons,
    sealedAt: args.sealedAt,
    kickoff: args.fixture.kickoff,
    commitmentHash: buildCommitment(commitmentCore(base), nonce),
    nonce,
  };
}

/** Reconstruct a minimal fixture from a stored prediction (manual matches). */
function fixtureFromRecord(r: PredictionRecord): Fixture {
  return {
    matchId: r.matchId,
    homeTeam: r.homeCode,
    homeCode: r.homeCode,
    awayTeam: r.awayCode,
    awayCode: r.awayCode,
    kickoff: r.kickoff,
    status: "FINISHED",
  };
}

function toOutcomeRecord(
  by: Predictor,
  pred: PredictionRecord,
  result: FinalResult,
  actual: Outcome,
  brier: number,
  correct: boolean,
): OutcomeRecord {
  return {
    type: "outcome",
    by,
    matchId: pred.matchId,
    homeCode: pred.homeCode,
    awayCode: pred.awayCode,
    pick: pred.pick,
    confidence: pred.confidence,
    actual,
    correct,
    brier,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    createdAt: nowIso(),
  };
}

// ── COMMIT ───────────────────────────────────────────────────────────────────

export interface CommitInput {
  matchId: string;
  uid: string;
  user?: { pick: Outcome; confidence: number; reasoning?: string };
}

export async function commitMatch(input: CommitInput) {
  const fixture = await getFixture(input.matchId);
  if (!fixture) throw new Error(`Unknown fixture ${input.matchId}`);

  const sealedAt = nowIso();
  const sealedBeforeKickoff = Date.parse(fixture.kickoff) > Date.now();

  const context = await recallContext({
    homeCode: fixture.homeCode,
    awayCode: fixture.awayCode,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    stage: fixture.stage,
    uid: input.uid,
  });
  const evaPred = await predict(fixture, context);
  const evaRecord = buildPredictionRecord({
    fixture,
    by: "eva",
    pick: evaPred.pick,
    confidence: evaPred.confidence,
    reasoning: evaPred.reasoning,
    appliedLessons: evaPred.appliedLessons,
    sealedAt,
  });
  const evaSeal = await sealPrediction(evaRecord);

  let user = null;
  if (input.user) {
    const userRecord = buildPredictionRecord({
      fixture,
      by: "user",
      pick: input.user.pick,
      confidence: input.user.confidence,
      reasoning: input.user.reasoning ?? "",
      appliedLessons: [],
      sealedAt,
    });
    const userSeal = await sealPrediction(userRecord, input.uid);
    user = {
      blobId: userSeal.blobId,
      commitmentHash: userRecord.commitmentHash,
      pick: userRecord.pick,
      confidence: userRecord.confidence,
    };
  }

  // EVA's pick stays hidden until reveal — only the sealed proof is returned.
  return {
    matchId: fixture.matchId,
    fixture,
    sealedAt,
    sealedBeforeKickoff,
    eva: {
      blobId: evaSeal.blobId,
      commitmentHash: evaRecord.commitmentHash,
      appliedLessonCount: evaRecord.appliedLessons.length,
    },
    user,
  };
}

// ── RESOLVE + LEARN ──────────────────────────────────────────────────────────

export interface ResolveInput {
  matchId: string;
  uid?: string;
  manual?: { homeScore: number; awayScore: number };
}

export async function resolveMatch(input: ResolveInput) {
  if (input.manual) {
    setManualResult({
      matchId: input.matchId,
      homeScore: input.manual.homeScore,
      awayScore: input.manual.awayScore,
    });
  }
  const result = await getResult(input.matchId);
  if (!result) return { resolved: false as const, reason: "no result available yet" };

  const actual = resultOutcome(result.homeScore, result.awayScore);
  const evaPred = await findPrediction({ matchId: input.matchId, by: "eva" });

  const outcomes: { record: OutcomeRecord; uid?: string }[] = [];
  let evaGrade: { correct: boolean; brier: number } | null = null;
  let userGrade: { correct: boolean; brier: number } | null = null;
  let lesson: Awaited<ReturnType<typeof postmortem>>["lesson"] | null = null;
  let lessonRecord: LessonRecord | undefined;
  let dossiers: DossierRecord[] | undefined;

  if (evaPred) {
    const g = gradePrediction(
      { pick: evaPred.pick, confidence: evaPred.confidence },
      result,
    );
    evaGrade = { correct: g.correct, brier: g.brier };
    outcomes.push({
      record: toOutcomeRecord("eva", evaPred, result, actual, g.brier, g.correct),
    });

    if (!g.correct || g.brier > 0.7) {
      const fx = (await getFixture(input.matchId)) ?? fixtureFromRecord(evaPred);
      const pm = await postmortem({
        fixture: fx,
        prediction: {
          pick: evaPred.pick,
          confidence: evaPred.confidence,
          reasoning: evaPred.reasoning,
          appliedLessons: evaPred.appliedLessons,
        },
        result,
        actual,
      });
      lesson = pm.lesson;
      lessonRecord = {
        type: "lesson",
        ...pm.lesson,
        fromMatchId: input.matchId,
        teams: [evaPred.homeCode, evaPred.awayCode],
        createdAt: nowIso(),
      };
      dossiers = [
        {
          type: "dossier",
          team: evaPred.homeCode,
          note: pm.homeNote.note,
          tags: pm.homeNote.tags,
          updatedAt: nowIso(),
        },
        {
          type: "dossier",
          team: evaPred.awayCode,
          note: pm.awayNote.note,
          tags: pm.awayNote.tags,
          updatedAt: nowIso(),
        },
      ];
    }
  }

  if (input.uid) {
    const userPred = await findPrediction({
      matchId: input.matchId,
      by: "user",
      uid: input.uid,
    });
    if (userPred) {
      const g = gradePrediction(
        { pick: userPred.pick, confidence: userPred.confidence },
        result,
      );
      userGrade = { correct: g.correct, brier: g.brier };
      outcomes.push({
        record: toOutcomeRecord("user", userPred, result, actual, g.brier, g.correct),
        uid: input.uid,
      });
    }
  }

  // One bulk write for all learnings — stays well under the rate limit.
  await recordLearnings({ outcomes, lesson: lessonRecord, dossiers });

  return { resolved: true as const, result, actual, evaGrade, userGrade, lesson };
}

// ── REVEAL ───────────────────────────────────────────────────────────────────

export async function revealMatch(matchId: string, uid?: string) {
  const [evaPred, liveResult, fixture] = await Promise.all([
    findPrediction({ matchId, by: "eva" }),
    getResult(matchId),
    getFixture(matchId),
  ]);

  // Fall back to the persisted outcome (e.g. a manual result graded on another
  // serverless instance) when no live result is available.
  let result = liveResult;
  if (!result) {
    const outcomes = await recallOutcomes({ by: "eva" });
    const stored = outcomes.find((o) => o.matchId === matchId);
    if (stored) {
      result = {
        matchId,
        homeScore: stored.homeScore,
        awayScore: stored.awayScore,
        source: "api",
      };
    }
  }

  const actual = result
    ? resultOutcome(result.homeScore, result.awayScore)
    : null;

  let eva = null;
  if (evaPred) {
    const verified = verifyCommitment(
      commitmentCore(evaPred),
      evaPred.nonce,
      evaPred.commitmentHash,
    );
    const grade =
      result &&
      gradePrediction(
        { pick: evaPred.pick, confidence: evaPred.confidence },
        result,
      );
    eva = {
      pick: evaPred.pick,
      confidence: evaPred.confidence,
      reasoning: evaPred.reasoning,
      appliedLessons: evaPred.appliedLessons,
      sealedAt: evaPred.sealedAt,
      commitmentHash: evaPred.commitmentHash,
      nonce: evaPred.nonce,
      verified,
      correct: grade ? grade.correct : null,
      brier: grade ? grade.brier : null,
    };
  }

  let user = null;
  if (uid) {
    const userPred = await findPrediction({ matchId, by: "user", uid });
    if (userPred) {
      const grade =
        result &&
        gradePrediction(
          { pick: userPred.pick, confidence: userPred.confidence },
          result,
        );
      user = {
        pick: userPred.pick,
        confidence: userPred.confidence,
        correct: grade ? grade.correct : null,
        brier: grade ? grade.brier : null,
      };
    }
  }

  return { matchId, fixture, result, actual, eva, user };
}

// ── SCOREBOARD + TIMELINE ────────────────────────────────────────────────────

// ── MEMORY INSPECTOR ─────────────────────────────────────────────────────────

export interface MemorySnapshot {
  account: string | null;
  predictions: {
    eva: RecalledRecord<PredictionRecord>[];
    user: RecalledRecord<PredictionRecord>[];
  };
  lessons: RecalledRecord<LessonRecord>[];
  dossiers: RecalledRecord<DossierRecord>[];
  outcomes: {
    eva: RecalledRecord<OutcomeRecord>[];
    user: RecalledRecord<OutcomeRecord>[];
  };
  total: number;
}

/** A live read of everything EVA is storing on Walrus, for the inspector. */
export async function getMemorySnapshot(uid?: string): Promise<MemorySnapshot> {
  // Kept lean to respect the relayer's weighted rate limit.
  const [evaPreds, userPreds, lessons, evaOut] = await Promise.all([
    recallRaw<PredictionRecord>("EVA sealed prediction pick confidence", NS.predictions, { topK: 50 }),
    uid
      ? recallRaw<PredictionRecord>("user sealed prediction pick", NS.userPredictions(uid), { topK: 50 })
      : Promise.resolve([]),
    recallRaw<LessonRecord>("lesson rule adjustment failure mode", NS.lessons, { topK: 50 }),
    recallRaw<OutcomeRecord>("outcome result hit miss brier", NS.evaScoreboard, { topK: 50 }),
  ]);

  const teams = new Set<string>();
  for (const p of evaPreds) {
    if (p.record.homeCode) teams.add(p.record.homeCode);
    if (p.record.awayCode) teams.add(p.record.awayCode);
  }
  const dossiers = (
    await Promise.all(
      [...teams]
        .slice(0, 3)
        .map((t) => recallRaw<DossierRecord>(`${t} scouting note form`, NS.dossier(t), { topK: 5 })),
    )
  ).flat();

  const total =
    evaPreds.length + userPreds.length + lessons.length + dossiers.length + evaOut.length;

  return {
    account:
      process.env.NEXT_PUBLIC_MEMWAL_ACCOUNT_ID ||
      process.env.MEMWAL_ACCOUNT_ID ||
      null,
    predictions: { eva: evaPreds, user: userPreds },
    lessons,
    dossiers,
    outcomes: { eva: evaOut, user: [] },
    total,
  };
}

export async function getScoreboard(uid?: string) {
  const [evaOutcomes, userOutcomes] = await Promise.all([
    recallOutcomes({ by: "eva" }),
    uid ? recallOutcomes({ by: "user", uid }) : Promise.resolve([]),
  ]);
  const evaAgg = aggregateScoreboard(evaOutcomes);
  const userAgg = aggregateScoreboard(userOutcomes);
  const timeline = [...evaOutcomes].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  return { eva: { ...evaAgg, timeline }, user: userAgg };
}
