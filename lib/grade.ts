/**
 * Grading for EVA's sealed predictions.
 *
 * A prediction is a 1X2 pick (HOME / DRAW / AWAY) plus a confidence 0–100 that
 * applies to the picked outcome. We score it two ways:
 *  - `correct`: did the pick match the actual result?
 *  - `brier`: a 3-class Brier score (lower is better, range 0–2). The picked
 *    outcome gets probability `confidence/100`; the remaining mass is split
 *    evenly across the other two outcomes. This is the calibration signal that
 *    should trend down as EVA learns.
 */

export type Outcome = "HOME" | "DRAW" | "AWAY";

const OUTCOMES: readonly Outcome[] = ["HOME", "DRAW", "AWAY"];

export interface Prediction {
  pick: Outcome;
  /** Confidence in the picked outcome, 0–100. Clamped to that range. */
  confidence: number;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

export interface Grade {
  correct: boolean;
  actual: Outcome;
  brier: number;
}

export function resultOutcome(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) return "HOME";
  if (homeScore < awayScore) return "AWAY";
  return "DRAW";
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function gradePrediction(
  prediction: Prediction,
  result: MatchResult,
): Grade {
  const actual = resultOutcome(result.homeScore, result.awayScore);
  const pPick = clamp01(prediction.confidence / 100);
  const pOther = (1 - pPick) / 2;

  let brier = 0;
  for (const outcome of OUTCOMES) {
    const forecast = outcome === prediction.pick ? pPick : pOther;
    const observed = outcome === actual ? 1 : 0;
    brier += (forecast - observed) ** 2;
  }

  return { correct: prediction.pick === actual, actual, brier };
}

export interface Scoreboard {
  n: number;
  hits: number;
  accuracy: number;
  meanBrier: number;
}

export function aggregateScoreboard(
  grades: ReadonlyArray<Pick<Grade, "correct" | "brier">>,
): Scoreboard {
  const n = grades.length;
  if (n === 0) {
    return { n: 0, hits: 0, accuracy: 0, meanBrier: 0 };
  }
  const hits = grades.filter((g) => g.correct).length;
  const totalBrier = grades.reduce((sum, g) => sum + g.brier, 0);
  return {
    n,
    hits,
    accuracy: hits / n,
    meanBrier: totalBrier / n,
  };
}
