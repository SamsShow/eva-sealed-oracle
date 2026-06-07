interface Agg {
  n: number;
  hits: number;
  accuracy: number;
  meanBrier: number;
}

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function Column({
  label,
  agg,
  accent,
}: {
  label: string;
  agg: Agg;
  accent: string;
}) {
  return (
    <div className="flex-1">
      <div className={`text-sm font-medium ${accent}`}>{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">
        {agg.n ? pct(agg.accuracy) : "—"}
      </div>
      <div className="text-xs text-zinc-500">
        {agg.hits}/{agg.n} correct · Brier {agg.n ? agg.meanBrier.toFixed(3) : "—"}
      </div>
    </div>
  );
}

export function Scoreboard({ eva, user }: { eva: Agg; user: Agg }) {
  const lead =
    eva.n && user.n
      ? eva.meanBrier < user.meanBrier
        ? "EVA is better calibrated"
        : user.meanBrier < eva.meanBrier
          ? "You are better calibrated"
          : "Dead even"
      : "Seal some calls to start the duel";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm tracking-[0.2em] text-zinc-400">SCOREBOARD</h2>
        <span className="text-xs text-emerald-400">{lead}</span>
      </div>
      <div className="flex gap-6">
        <Column label="EVA" agg={eva} accent="text-sky-400" />
        <div className="w-px bg-zinc-800" />
        <Column label="You" agg={user} accent="text-fuchsia-400" />
      </div>
      <p className="mt-3 text-[11px] text-zinc-600">
        Brier measures calibration (lower is better). EVA&apos;s should trend
        down as she remembers.
      </p>
    </div>
  );
}
