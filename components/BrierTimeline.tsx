interface TimelinePoint {
  matchId: string;
  homeCode: string;
  awayCode: string;
  brier: number;
  correct: boolean;
}

/** "Day 1 vs Now" — EVA's calibration over time. Lower bars = sharper calls. */
export function BrierTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length < 2) {
    return (
      <div className="eva-card rise p-6">
        <h2 className="text-xs font-medium tracking-[0.18em] text-faint">
          DAY 1 → NOW
        </h2>
        <p className="mt-3 text-sm text-muted">
          The before / after appears once EVA has graded a few matches. Check
          back after a few days of the tournament.
        </p>
      </div>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const max = Math.max(...points.map((p) => p.brier), 2);
  const sharper = last.brier < first.brier;

  return (
    <div className="eva-card rise p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-[0.18em] text-faint">
          DAY 1 → NOW
        </h2>
        <span className={`seal-chip ${sharper ? "seed-chip" : ""}`}>
          <span className="mono">
            {first.brier.toFixed(2)} → {last.brier.toFixed(2)}
          </span>
          {sharper ? " sharper" : " Brier"}
        </span>
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {points.map((p, i) => (
          <div
            key={`${p.matchId}-${i}`}
            className="flex-1 rounded-t-md transition-all"
            title={`${p.homeCode} v ${p.awayCode} · Brier ${p.brier.toFixed(3)}`}
            style={{
              height: `${Math.max(6, (p.brier / max) * 100)}%`,
              background: p.correct
                ? "linear-gradient(180deg,#34d399,#10b981)"
                : "linear-gradient(180deg,#fb7185,#f43f5e)",
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-faint">
        <span>
          Day 1 · {first.homeCode} v {first.awayCode}
        </span>
        <span>
          Now · {last.homeCode} v {last.awayCode}
        </span>
      </div>
    </div>
  );
}
