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
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex items-center gap-4">
        <EvaMark />
        <div>
          <p className="text-[11px] tracking-[0.3em] text-sky-400">THE SEALED ORACLE</p>
          <h1 className="text-3xl font-semibold">EVA</h1>
        </div>
      </header>
      <p className="mt-4 max-w-xl text-sm text-zinc-400">
        EVA seals every World Cup call on-chain before kickoff — proof she
        can&apos;t rewrite history — and gets sharper every match because she
        remembers what she got wrong. Seal your own calls and out-predict her.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Scoreboard eva={board.eva} user={board.user} />
        <BrierTimeline points={board.eva.timeline} />
      </div>

      <h2 className="mt-10 mb-3 text-sm tracking-[0.2em] text-zinc-400">FIXTURES</h2>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading fixtures…</p>
      ) : fixtures.length === 0 ? (
        <p className="text-sm text-zinc-500">
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
