interface Agg {
  n: number;
  hits: number;
  accuracy: number;
  meanBrier: number;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Column({
  label,
  agg,
  color,
}: {
  label: string;
  agg: Agg;
  color: string;
}) {
  return (
    <div className="flex-1">
      <div className="text-xs font-semibold tracking-wide" style={{ color }}>
        {label}
      </div>
      <div className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
        {agg.n ? pct(agg.accuracy) : "—"}
      </div>
      <div className="mt-0.5 text-xs text-faint">
        {agg.hits}/{agg.n} correct · Brier{" "}
        <span className="mono">{agg.n ? agg.meanBrier.toFixed(3) : "—"}</span>
      </div>
    </div>
  );
}

export function Scoreboard({ eva, user }: { eva: Agg; user: Agg }) {
  const lead =
    eva.n && user.n
      ? eva.meanBrier < user.meanBrier
        ? "EVA is sharper"
        : user.meanBrier < eva.meanBrier
          ? "You're sharper"
          : "Dead even"
      : "Seal a call to begin";

  return (
    <div className="eva-card rise p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-[0.18em] text-faint">
          THE DUEL
        </h2>
        <span className="seal-chip seed-chip">{lead}</span>
      </div>
      <div className="flex items-stretch gap-6">
        <Column label="EVA" agg={eva} color="var(--accent)" />
        <div className="w-px bg-[color:var(--line)]" />
        <Column label="YOU" agg={user} color="var(--user)" />
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        Brier measures calibration — lower is better. EVA&apos;s should drift
        down as she remembers.
      </p>
    </div>
  );
}
