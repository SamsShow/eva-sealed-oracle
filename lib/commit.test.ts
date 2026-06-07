import { describe, expect, it } from "vitest";
import { buildCommitment, generateNonce, verifyCommitment } from "./commit";

const PREDICTION = {
  matchId: "WC-2026-12",
  pick: "HOME",
  confidence: 72,
};

describe("buildCommitment", () => {
  it("is deterministic for the same payload + nonce", () => {
    const a = buildCommitment(PREDICTION, "nonce-1");
    const b = buildCommitment(PREDICTION, "nonce-1");
    expect(a).toBe(b);
  });

  it("produces a 64-char hex sha-256 digest", () => {
    const hash = buildCommitment(PREDICTION, "nonce-1");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores object key ordering (canonical serialization)", () => {
    const reordered = { confidence: 72, pick: "HOME", matchId: "WC-2026-12" };
    expect(buildCommitment(reordered, "nonce-1")).toBe(
      buildCommitment(PREDICTION, "nonce-1"),
    );
  });

  it("changes when the nonce changes", () => {
    expect(buildCommitment(PREDICTION, "nonce-1")).not.toBe(
      buildCommitment(PREDICTION, "nonce-2"),
    );
  });

  it("changes when the prediction changes", () => {
    const tampered = { ...PREDICTION, pick: "AWAY" };
    expect(buildCommitment(tampered, "nonce-1")).not.toBe(
      buildCommitment(PREDICTION, "nonce-1"),
    );
  });
});

describe("verifyCommitment", () => {
  it("accepts a faithful reveal", () => {
    const hash = buildCommitment(PREDICTION, "nonce-1");
    expect(verifyCommitment(PREDICTION, "nonce-1", hash)).toBe(true);
  });

  it("rejects a tampered prediction (the no-hindsight guarantee)", () => {
    const hash = buildCommitment(PREDICTION, "nonce-1");
    const tampered = { ...PREDICTION, pick: "AWAY" };
    expect(verifyCommitment(tampered, "nonce-1", hash)).toBe(false);
  });

  it("rejects a wrong nonce", () => {
    const hash = buildCommitment(PREDICTION, "nonce-1");
    expect(verifyCommitment(PREDICTION, "nonce-2", hash)).toBe(false);
  });
});

describe("generateNonce", () => {
  it("returns a 32-char hex string", () => {
    expect(generateNonce()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns a different value each call", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});
