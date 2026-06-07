/**
 * Structured generation against a local OpenAI-compatible model (LM Studio /
 * Ollama / vLLM, tunneled via ngrok or Cloudflare). We call /chat/completions
 * directly so we can:
 *  - read `reasoning_content` as well as `content` (Qwen3 and other reasoning
 *    models return their answer in the reasoning field),
 *  - fail over from the primary tunnel to a fallback tunnel,
 *  - send the ngrok skip-warning header.
 * The answer is extracted as JSON and validated with Zod, retrying with a
 * repair instruction if needed.
 */

import type { z } from "zod";
import { extractJson } from "./json";

function endpoints(): string[] {
  const eps = [
    process.env.LOCAL_MODEL_BASE_URL,
    process.env.LOCAL_MODEL_FALLBACK_URL,
  ].filter((u): u is string => Boolean(u));
  if (eps.length === 0) {
    throw new Error(
      "LOCAL_MODEL_BASE_URL not set — point it at your model's OpenAI-compatible base URL (usually ending in /v1)",
    );
  }
  return eps;
}

async function chat(
  baseURL: string,
  system: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${baseURL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.LOCAL_MODEL_API_KEY || "local"}`,
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      model: process.env.LOCAL_MODEL_NAME || "local-model",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2000,
      stream: false,
    }),
    // Don't let Next's fetch cache/wrap a long, dynamic POST; fail fast on hang.
    cache: "no-store",
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) {
    throw new Error(`model ${baseURL} responded ${res.status}`);
  }
  const data = await res.json();
  const msg = data?.choices?.[0]?.message ?? {};
  const content = typeof msg.content === "string" ? msg.content.trim() : "";
  // Reasoning models (e.g. Qwen3) put the answer in reasoning_content.
  return content || msg.reasoning_content || "";
}

export async function generateStructured<T>(
  schema: z.ZodType<T>,
  args: { system: string; prompt: string; shape: string; maxRetries?: number },
): Promise<T> {
  const retries = args.maxRetries ?? 2;
  const eps = endpoints();
  let lastError: unknown;

  for (const baseURL of eps) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const repair =
        attempt > 0
          ? "\n\nYour previous reply did not match. Use the EXACT field names and value formats shown. Output ONLY the JSON object."
          : "";
      try {
        const text = await chat(
          baseURL,
          args.system,
          // `/no_think` is a Qwen soft-switch that skips the reasoning phase —
          // faster and cleaner for structured output (ignored by other models).
          `${args.prompt}\n\nOutput a single JSON object with EXACTLY this shape — same field names, same value formats, no extra or renamed fields:\n${args.shape}\n\nNo prose, no markdown fences.${repair} /no_think`,
        );
        const parsed = schema.safeParse(extractJson(text));
        if (parsed.success) return parsed.data;
        lastError = parsed.error;
      } catch (err) {
        // Network / server error — stop retrying this endpoint, try the next.
        lastError = err;
        console.error(
          "[eva] model fetch error",
          baseURL,
          err instanceof Error ? err.message : err,
          "| cause:",
          err instanceof Error && err.cause instanceof Error ? err.cause.message : "",
        );
        break;
      }
    }
  }

  throw new Error(
    `Local model did not return valid JSON: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
