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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="text-sm tracking-[0.2em] text-zinc-400">DAY 1 vs NOW</h2>
        <p className="mt-2 text-sm text-zinc-500">
          The before/after appears once EVA has graded a few matches. Come back
          after a few days of the tournament.
        </p>
      </div>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const max = Math.max(...points.map((p) => p.brier), 2);
  const trend = last.brier < first.brier;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm tracking-[0.2em] text-zinc-400">DAY 1 vs NOW</h2>
        <span className={`text-xs ${trend ? "text-emerald-400" : "text-amber-400"}`}>
          {trend
            ? `sharper: ${first.brier.toFixed(2)} → ${last.brier.toFixed(2)} Brier`
            : `Brier ${first.brier.toFixed(2)} → ${last.brier.toFixed(2)}`}
        </span>
      </div>
      <div className="flex h-28 items-end gap-1">
        {points.map((p, i) => (
          <div
            key={`${p.matchId}-${i}`}
            className="group relative flex-1"
            title={`${p.homeCode} v ${p.awayCode} · Brier ${p.brier.toFixed(3)}`}
          >
            <div
              className={`w-full rounded-t ${p.correct ? "bg-emerald-500/70" : "bg-rose-500/70"}`}
              style={{ height: `${Math.max(6, (p.brier / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
        <span>Day 1 · {first.homeCode} v {first.awayCode}</span>
        <span>Now · {last.homeCode} v {last.awayCode}</span>
      </div>
    </div>
  );
}
