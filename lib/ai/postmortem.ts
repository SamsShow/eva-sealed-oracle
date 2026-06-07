/**
 * EVA's learning step. After a result is known, she compares her sealed call to
 * what happened and distills ONE transferable lesson (not a match recap), plus a
 * short scouting note per team for the dossiers. The lesson is what makes the
 * next prediction visibly sharper.
 */

import { generateObject } from "ai";
import { z } from "zod";
import type { EvaPrediction } from "./predict";
import type { Fixture, FinalResult, Outcome } from "../types";
import { evaModel } from "./models";

const ScoutNoteSchema = z.object({
  note: z.string().describe("One concrete observation from this match."),
  tags: z.array(z.string()).describe("2–4 short tags, e.g. press-vulnerable."),
});

const PostmortemSchema = z.object({
  lesson: z.object({
    rule: z.string().describe("A reusable forecasting rule, not a match recap."),
    failureMode: z.string().describe("What specifically went wrong in your reasoning."),
    adjustment: z.string().describe("The concrete change for future calls (e.g. a confidence cap)."),
    appliesWhen: z.string().describe("The conditions under which this rule should fire."),
  }),
  homeNote: ScoutNoteSchema,
  awayNote: ScoutNoteSchema,
});

export type Postmortem = z.infer<typeof PostmortemSchema>;

const SYSTEM = `You are EVA, reviewing one of your own World Cup predictions after the result.
Be ruthlessly honest about WHY you were wrong (or right but for the wrong reasons).
Output ONE transferable lesson that would change a FUTURE prediction — never a restatement
of this match. Name the failure mode and a specific adjustment.`;

export async function postmortem(args: {
  fixture: Fixture;
  prediction: EvaPrediction;
  result: FinalResult;
  actual: Outcome;
}): Promise<Postmortem> {
  const { fixture, prediction, result, actual } = args;
  const { object } = await generateObject({
    model: evaModel(),
    schema: PostmortemSchema,
    system: SYSTEM,
    prompt: `Fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}${
      fixture.stage ? ` (${fixture.stage})` : ""
    }.
Your sealed call: pick ${prediction.pick} @${prediction.confidence}. Reasoning: ${prediction.reasoning}
Actual result: ${fixture.homeTeam} ${result.homeScore}–${result.awayScore} ${fixture.awayTeam} (outcome: ${actual}).

Distill the lesson and a scouting note for each team.`,
  });
  return object;
}
