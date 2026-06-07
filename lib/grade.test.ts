import { describe, expect, it } from "vitest";
import { aggregateScoreboard, gradePrediction, resultOutcome } from "./grade";

describe("resultOutcome", () => {
  it("returns HOME when home scores more", () => {
    expect(resultOutcome(2, 1)).toBe("HOME");
  });
  it("returns AWAY when away scores more", () => {
    expect(resultOutcome(1, 3)).toBe("AWAY");
  });
  it("returns DRAW on equal scores", () => {
    expect(resultOutcome(0, 0)).toBe("DRAW");
  });
});

describe("gradePrediction", () => {
  it("scores a fully-confident correct pick as Brier 0", () => {
    const g = gradePrediction(
      { pick: "HOME", confidence: 100 },
      { homeScore: 2, awayScore: 0 },
    );
    expect(g.correct).toBe(true);
    expect(g.actual).toBe("HOME");
    expect(g.brier).toBeCloseTo(0, 6);
  });

  it("scores a fully-confident wrong pick as Brier 2", () => {
    const g = gradePrediction(
      { pick: "HOME", confidence: 100 },
      { homeScore: 0, awayScore: 1 },
    );
    expect(g.correct).toBe(false);
    expect(g.actual).toBe("AWAY");
    expect(g.brier).toBeCloseTo(2, 6);
  });

  it("spreads remaining probability evenly across the other two outcomes", () => {
    // confidence 50 on HOME -> P(HOME)=0.5, P(DRAW)=P(AWAY)=0.25; actual HOME
    // Brier = (0.5-1)^2 + (0.25)^2 + (0.25)^2 = 0.25 + 0.0625 + 0.0625
    const g = gradePrediction(
      { pick: "HOME", confidence: 50 },
      { homeScore: 1, awayScore: 0 },
    );
    expect(g.brier).toBeCloseTo(0.375, 6);
  });

  it("clamps confidence above 100", () => {
    const g = gradePrediction(
      { pick: "DRAW", confidence: 150 },
      { homeScore: 1, awayScore: 1 },
    );
    expect(g.correct).toBe(true);
    expect(g.brier).toBeCloseTo(0, 6);
  });
});

describe("aggregateScoreboard", () => {
  it("computes accuracy and mean Brier across graded predictions", () => {
    const board = aggregateScoreboard([
      { correct: true, brier: 0 },
      { correct: false, brier: 2 },
    ]);
    expect(board.n).toBe(2);
    expect(board.hits).toBe(1);
    expect(board.accuracy).toBeCloseTo(0.5, 6);
    expect(board.meanBrier).toBeCloseTo(1, 6);
  });

  it("returns zeroed stats for an empty list", () => {
    const board = aggregateScoreboard([]);
    expect(board.n).toBe(0);
    expect(board.accuracy).toBe(0);
    expect(board.meanBrier).toBe(0);
  });
});
