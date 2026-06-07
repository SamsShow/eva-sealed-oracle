/**
 * EVA's prediction step. Recalled memory (lessons, dossiers, past calls, user
 * bias) is rendered into the prompt; EVA must state which lessons she's applying
 * so memory's effect on the call is observable in the UI.
 */

import { generateObject } from "ai";
import { z } from "zod";
import type { FixtureContext } from "../memwal/client";
import type { Fixture } from "../types";
import { buildContextBlock } from "./context";
import { evaModel } from "./models";

const PredictionSchema = z.object({
  pick: z.enum(["HOME", "DRAW", "AWAY"]),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence in the picked outcome, 0–100."),
  reasoning: z
    .string()
    .describe("2–4 sentences. Reference specific factors, not platitudes."),
  appliedLessons: z
    .array(z.string())
    .describe(
      "The exact lesson rules from memory you applied, and how each changed this call. Empty if none applied.",
    ),
});

export type EvaPrediction = z.infer<typeof PredictionSchema>;

const SYSTEM = `You are EVA — a self-correcting World Cup forecaster.
You remember every past call and every lesson you've distilled from your mistakes.
Before predicting, review the lessons in memory and APPLY the ones that fit this fixture.
Be decisive but calibrated: your confidence should reflect genuine uncertainty, and you
must NOT repeat a mistake a past lesson warns against. You are sharp, a little cocky, and
you take pride in getting better over time.`;

export async function predict(
  fixture: Fixture,
  context: FixtureContext,
): Promise<EvaPrediction> {
  const contextBlock = buildContextBlock(context);
  const { object } = await generateObject({
    model: evaModel(),
    schema: PredictionSchema,
    system: SYSTEM,
    prompt: `Fixture: ${fixture.homeTeam} (home) vs ${fixture.awayTeam} (away)${
      fixture.stage ? `, ${fixture.stage}` : ""
    }, kickoff ${fixture.kickoff}.

${contextBlock}

Make your sealed prediction now. List in appliedLessons which remembered lessons you used and how each changed your pick or confidence.`,
  });
  return object;
}
