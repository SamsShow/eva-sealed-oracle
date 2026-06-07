"use client";

import { useCallback, useEffect, useState } from "react";
import { BrierTimeline } from "@/components/BrierTimeline";
import { EvaMark } from "@/components/EvaMark";
import { MatchCard, type Fixture } from "@/components/MatchCard";
import { ProvenanceFooter } from "@/components/ProvenanceFooter";
import { Scoreboard } from "@/components/Scoreboard";
import { getUid } from "@/lib/uid";

interface Agg {
  n: number;
  hits: number;
  accuracy: number;
  meanBrier: number;
}
interface ScoreboardData {
  eva: Agg & {
    timeline: {
      matchId: string;
      homeCode: string;
      awayCode: string;
      brier: number;
      correct: boolean;
    }[];
  };
  user: Agg;
}

const EMPTY: ScoreboardData = {
  eva: { n: 0, hits: 0, accuracy: 0, meanBrier: 0, timeline: [] },
  user: { n: 0, hits: 0, accuracy: 0, meanBrier: 0 },
};

export default function Home() {
  const [uid, setUid] = useState("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [board, setBoard] = useState<ScoreboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUid(getUid());
  }, []);

  const refreshBoard = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await fetch(`/api/scoreboard?uid=${uid}`);
      if (res.ok) setBoard((await res.json()) as ScoreboardData);
    } catch {
      /* leave previous board */
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/fixtures");
        const data = await res.json();
        const list = (data.fixtures ?? []) as Fixture[];
        list.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
        setFixtures(list.slice(0, 24));
      } finally {
        setLoading(false);
      }
      refreshBoard();
    })();
  }, [uid, refreshBoard]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="rise flex items-center justify-between">
        <div className="flex items-center gap-4">
          <EvaMark />
          <div>
            <p className="text-[11px] font-medium tracking-[0.28em] text-[color:var(--accent)]">
              THE SEALED ORACLE
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">EVA</h1>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--seed)]" />
          live
        </span>
      </header>
      <p className="rise mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
        EVA seals every World Cup call on-chain before kickoff — proof she
        can&apos;t rewrite history — and gets sharper every match because she
        remembers what she got wrong. Seal your own calls and try to out-predict
        her.
      </p>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <Scoreboard eva={board.eva} user={board.user} />
        <BrierTimeline points={board.eva.timeline} />
      </div>

      <h2 className="mt-11 mb-4 text-xs font-medium tracking-[0.18em] text-faint">
        FIXTURES
      </h2>
      {loading ? (
        <p className="text-sm text-muted">Loading fixtures…</p>
      ) : fixtures.length === 0 ? (
        <p className="text-sm text-muted">
          No fixtures available. Add FOOTBALL_DATA_API_KEY, or the built-in demo
          fixtures will appear when no key is set.
        </p>
      ) : (
        <div className="space-y-4">
          {fixtures.map((f) => (
            <MatchCard
              key={f.matchId}
              fixture={f}
              uid={uid}
              onResolved={refreshBoard}
            />
          ))}
        </div>
      )}

      <ProvenanceFooter />
    </main>
  );
}
