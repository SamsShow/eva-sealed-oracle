/**
 * Structured generation that works with any local chat model — we ask for a
 * JSON object in plain text, extract it, and validate with Zod, retrying with a
 * repair instruction if the model misbehaves. This avoids depending on
 * provider-side structured-output support, which local servers often lack.
 */

import { generateText } from "ai";
import type { z } from "zod";
import { extractJson } from "./json";
import { evaModel } from "./models";

export async function generateStructured<T>(
  schema: z.ZodType<T>,
  args: { system: string; prompt: string; maxRetries?: number },
): Promise<T> {
  const retries = args.maxRetries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const repair =
      attempt > 0
        ? "\n\nYour previous reply was not valid JSON or was missing required fields. Output ONLY the JSON object, nothing else."
        : "";
    const { text } = await generateText({
      model: evaModel(),
      system: args.system,
      prompt: `${args.prompt}\n\nRespond with ONLY a single JSON object — no prose, no markdown fences.${repair}`,
      temperature: 0.4,
    });

    const parsed = schema.safeParse(extractJson(text));
    if (parsed.success) return parsed.data;
    lastError = parsed.error;
  }

  throw new Error(
    `Local model did not return valid JSON after ${retries + 1} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
