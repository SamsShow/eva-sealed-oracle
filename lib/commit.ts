/**
 * Commit-reveal for EVA's sealed prophecies.
 *
 * At COMMIT time (before kickoff) we publish a SHA-256 commitment of the
 * prediction plus a random nonce. The hash leaks nothing about the pick, but
 * because it is timestamped before the match, it pins the prediction in time.
 * At REVEAL time we publish the plaintext + nonce, and anyone can re-hash to
 * confirm EVA did not change her call after the fact — proof of no hindsight.
 *
 * The nonce is essential: with only three outcomes and a small confidence
 * range, a bare prediction hash would be trivially brute-forceable.
 */

import { createHash, randomBytes } from "node:crypto";

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/** Deterministic JSON serialization with recursively sorted object keys. */
function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value as Json));
}

function sortKeys(value: Json): Json {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const sorted: { [key: string]: Json } = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(value[key]);
    }
    return sorted;
  }
  return value;
}

export function buildCommitment(
  prediction: Record<string, unknown>,
  nonce: string,
): string {
  const payload = canonicalize({ prediction, nonce });
  return createHash("sha256").update(payload).digest("hex");
}

export function verifyCommitment(
  prediction: Record<string, unknown>,
  nonce: string,
  hash: string,
): boolean {
  return buildCommitment(prediction, nonce) === hash;
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}
