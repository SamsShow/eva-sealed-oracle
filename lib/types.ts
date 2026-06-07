/** Shared domain types for EVA. */

import type { Outcome } from "./grade";

export type { Outcome } from "./grade";

/** Who made a prediction. */
export type Predictor = "eva" | "user";

/** A World Cup fixture, normalized across data sources. */
export interface Fixture {
  matchId: string;
  homeTeam: string;
  homeCode: string;
  awayTeam: string;
  awayCode: string;
  /** ISO-8601 kickoff time (UTC). */
  kickoff: string;
  stage?: string;
  status: "SCHEDULED" | "IN_PLAY" | "FINISHED";
}

/** A final score for a fixture. */
export interface FinalResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  source: "api" | "manual";
}

/** A sealed prediction record (stored as the JSON tail of a memory). */
export interface PredictionRecord {
  type: "prediction";
  by: Predictor;
  matchId: string;
  homeCode: string;
  awayCode: string;
  pick: Outcome;
  /** 0–100, confidence in the picked outcome. */
  confidence: number;
  reasoning: string;
  /** Lessons EVA cited at commit time (empty for the user / day one). */
  appliedLessons: string[];
  /** ISO-8601 timestamp the prediction was sealed (before kickoff). */
  sealedAt: string;
  kickoff: string;
  /** SHA-256 commitment over the prediction payload + nonce. */
  commitmentHash: string;
  /** Reveal nonce (kept with the record so the commitment can be verified). */
  nonce: string;
}

/** A distilled, transferable lesson EVA learned from a miss. */
export interface LessonRecord {
  type: "lesson";
  rule: string;
  failureMode: string;
  adjustment: string;
  appliesWhen: string;
  fromMatchId: string;
  teams: string[];
  createdAt: string;
}

/** An evolving scouting note for one team. */
export interface DossierRecord {
  type: "dossier";
  team: string;
  note: string;
  tags: string[];
  updatedAt: string;
}

/** A note about a user's prediction tendencies. */
export interface BiasRecord {
  type: "bias";
  note: string;
  tendencies: string[];
  updatedAt: string;
}

/** A graded outcome, stored to the scoreboard namespace. */
export interface OutcomeRecord {
  type: "outcome";
  by: Predictor;
  matchId: string;
  homeCode: string;
  awayCode: string;
  pick: Outcome;
  confidence: number;
  actual: Outcome;
  correct: boolean;
  brier: number;
  homeScore: number;
  awayScore: number;
  createdAt: string;
}
