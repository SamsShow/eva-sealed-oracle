import { anthropic } from "@ai-sdk/anthropic";

/**
 * EVA's reasoning model. Sonnet is the default — strong reasoning at a price
 * that suits frequent per-match calls. Override with EVA_MODEL (e.g.
 * `claude-opus-4-8` for the finals, `claude-haiku-4-5` to economize).
 */
export function evaModel() {
  return anthropic(process.env.EVA_MODEL || "claude-sonnet-4-6");
}
