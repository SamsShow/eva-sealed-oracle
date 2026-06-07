/**
 * EVA's prediction step. Recalled memory (lessons, dossiers, past calls, user
 * bias) is rendered into the prompt; EVA must state which lessons she's applying
 * so memory's effect on the call is observable in the UI.
 */

import { z } from "zod";
import type { FixtureContext } from "../memwal/client";
import type { Fixture } from "../types";
import { buildContextBlock } from "./context";
import { generateStructured } from "./generate";

const PredictionSchema = z.object({
  pick: z.enum(["HOME", "DRAW", "AWAY"]),
  confidence: z.number(),
  reasoning: z.string(),
  appliedLessons: z.array(z.string()).optional(),
});

export interface EvaPrediction {
  pick: "HOME" | "DRAW" | "AWAY";
  confidence: number;
  reasoning: string;
  appliedLessons: string[];
}

const SYSTEM = `You are EVA — a self-correcting World Cup forecaster.
You remember every past call and every lesson you've distilled from your mistakes.
Before predicting, review the lessons in memory and APPLY the ones that fit this fixture.
Be decisive but calibrated, and do NOT repeat a mistake a past lesson warns against.
You are sharp, a little cocky, and you take pride in getting better over time.`;

export async function predict(
  fixture: Fixture,
  context: FixtureContext,
): Promise<EvaPrediction> {
  const contextBlock = buildContextBlock(context);
  const shape = `{"pick":"HOME"|"DRAW"|"AWAY","confidence":<integer 0-100>,"reasoning":"<2-4 sentences, specific factors>","appliedLessons":["<remembered lesson you applied>"]}
HOME means ${fixture.homeTeam} win, AWAY means ${fixture.awayTeam} win, DRAW means a draw. "pick" MUST be exactly HOME, DRAW, or AWAY. "confidence" is an integer 0-100 (not a fraction). "appliedLessons" is the list of remembered lessons you used (empty array if none).`;

  const raw = await generateStructured(PredictionSchema, {
    system: SYSTEM,
    shape,
    prompt: `Fixture: ${fixture.homeTeam} (home) vs ${fixture.awayTeam} (away)${
      fixture.stage ? `, ${fixture.stage}` : ""
    }, kickoff ${fixture.kickoff}.

${contextBlock}

Make your sealed prediction now. In appliedLessons, list which remembered lessons you used and how each changed your pick or confidence.`,
  });

  // Defensive: some models emit confidence as a 0–1 fraction.
  let confidence = raw.confidence;
  if (confidence > 0 && confidence <= 1) confidence *= 100;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  return {
    pick: raw.pick,
    confidence,
    reasoning: raw.reasoning,
    appliedLessons: raw.appliedLessons ?? [],
  };
}
