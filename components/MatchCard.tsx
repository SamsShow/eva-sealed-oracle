"use client";

import { useState } from "react";

type Outcome = "HOME" | "DRAW" | "AWAY";

export interface Fixture {
  matchId: string;
  homeTeam: string;
  homeCode: string;
  awayTeam: string;
  awayCode: string;
  kickoff: string;
  stage?: string;
  status: "SCHEDULED" | "IN_PLAY" | "FINISHED";
}

interface Reveal {
  result: { homeScore: number; awayScore: number } | null;
  actual: Outcome | null;
  eva: {
    pick: Outcome;
    confidence: number;
    reasoning: string;
    appliedLessons: string[];
    commitmentHash: string;
    verified: boolean;
    correct: boolean | null;
  } | null;
  user: { pick: Outcome; confidence: number; correct: boolean | null } | null;
  lesson?: { rule: string; adjustment: string } | null;
}

const verdict = (o: Outcome, f: Fixture) =>
  o === "HOME" ? f.homeTeam : o === "AWAY" ? f.awayTeam : "Draw";

export function MatchCard({
  fixture,
  uid,
  onResolved,
}: {
  fixture: Fixture;
  uid: string;
  onResolved: () => void;
}) {
  const [pick, setPick] = useState<Outcome | null>(null);
  const [confidence, setConfidence] = useState(60);
  const [phase, setPhase] = useState<"idle" | "working" | "sealed" | "revealed">("idle");
  const [seal, setSeal] = useState<{
    commitmentHash: string;
    sealedBeforeKickoff: boolean;
    userPick: Outcome;
    userConfidence: number;
  } | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function sealCalls() {
    if (!pick) return;
    setError(null);
    setPhase("working");
    try {
      const res = await fetch("/api/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchId: fixture.matchId,
          uid,
          user: { pick, confidence },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "commit failed");
      setSeal({
        commitmentHash: data.eva.commitmentHash,
        sealedBeforeKickoff: data.sealedBeforeKickoff,
        userPick: pick,
        userConfidence: confidence,
      });
      setPhase("sealed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setPhase("idle");
    }
  }

  async function resolveReveal() {
    setError(null);
    setPhase("working");
    try {
      const manual =
        home !== "" && away !== ""
          ? { homeScore: Number(home), awayScore: Number(away) }
          : undefined;
      const r = await fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: fixture.matchId, uid, manual }),
      });
      const rd = await r.json();
      if (!r.ok) throw new Error(rd.error || "resolve failed");
      if (!rd.resolved) throw new Error(rd.reason || "no result yet");

      const rev = await fetch(
        `/api/reveal?matchId=${encodeURIComponent(fixture.matchId)}&uid=${uid}`,
      );
      const revData = (await rev.json()) as Reveal;
      setReveal({ ...revData, lesson: rd.lesson });
      setPhase("revealed");
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setPhase("sealed");
    }
  }

  const kickoff = new Date(fixture.kickoff);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-medium">
          {fixture.homeTeam} <span className="text-zinc-600">vs</span> {fixture.awayTeam}
        </h3>
        {fixture.stage && (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">
            {fixture.stage}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-xs text-zinc-500">
        {kickoff.toUTCString()} · {fixture.status}
      </div>

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      {phase === "idle" && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            {(["HOME", "DRAW", "AWAY"] as Outcome[]).map((o) => (
              <button
                key={o}
                onClick={() => setPick(o)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  pick === o
                    ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {verdict(o, fixture)}
              </button>
            ))}
          </div>
          <label className="block text-xs text-zinc-400">
            Your confidence: <span className="text-zinc-200">{confidence}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="mt-1 w-full accent-fuchsia-500"
            />
          </label>
          <button
            onClick={sealCalls}
            disabled={!pick}
            className="w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40"
          >
            Seal both calls 🔒
          </button>
        </div>
      )}

      {phase === "working" && (
        <p className="mt-4 animate-pulse text-sm text-sky-400">EVA is thinking…</p>
      )}

      {phase === "sealed" && seal && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-sky-900 bg-sky-950/30 p-3">
            <div className="text-sm text-sky-300">🔒 EVA&apos;s prophecy is sealed.</div>
            <div className="mt-1 font-mono text-[11px] break-all text-zinc-500">
              commit {seal.commitmentHash.slice(0, 24)}…
            </div>
            <div className="text-[11px] text-zinc-500">
              {seal.sealedBeforeKickoff
                ? "✓ sealed before kickoff"
                : "⚠ sealed after kickoff (no-hindsight not guaranteed)"}
            </div>
          </div>
          <div className="text-sm text-zinc-400">
            Your call: <span className="text-fuchsia-300">{verdict(seal.userPick, fixture)}</span> @{seal.userConfidence}
          </div>
          <div className="flex items-end gap-2">
            <input
              value={home}
              onChange={(e) => setHome(e.target.value)}
              placeholder={fixture.homeCode}
              inputMode="numeric"
              className="w-16 rounded border border-zinc-800 bg-transparent px-2 py-1 text-sm"
            />
            <span className="pb-1 text-zinc-600">–</span>
            <input
              value={away}
              onChange={(e) => setAway(e.target.value)}
              placeholder={fixture.awayCode}
              inputMode="numeric"
              className="w-16 rounded border border-zinc-800 bg-transparent px-2 py-1 text-sm"
            />
            <button
              onClick={resolveReveal}
              className="ml-auto rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-zinc-950"
            >
              Resolve &amp; reveal
            </button>
          </div>
          <p className="text-[11px] text-zinc-600">
            Leave scores blank to use the live result feed; enter them to resolve
            manually.
          </p>
        </div>
      )}

      {phase === "revealed" && reveal && (
        <div className="mt-4 space-y-3">
          {reveal.result && (
            <div className="text-sm text-zinc-300">
              Result: {fixture.homeTeam} {reveal.result.homeScore}–{reveal.result.awayScore} {fixture.awayTeam}
            </div>
          )}
          {reveal.eva && (
            <div className="rounded-lg border border-sky-900 bg-sky-950/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-sky-300">
                  EVA called {verdict(reveal.eva.pick, fixture)} @{reveal.eva.confidence}
                </span>
                <span
                  className={`text-xs ${reveal.eva.correct ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {reveal.eva.correct == null ? "" : reveal.eva.correct ? "HIT" : "MISS"}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{reveal.eva.reasoning}</p>
              {reveal.eva.appliedLessons.length > 0 && (
                <div className="mt-2 text-xs text-emerald-400">
                  Lessons applied: {reveal.eva.appliedLessons.join("; ")}
                </div>
              )}
              <div className="mt-2 font-mono text-[11px] text-zinc-600">
                {reveal.eva.verified ? "✓ commitment verified — no hindsight" : "✗ commitment mismatch"}
              </div>
            </div>
          )}
          {reveal.user && (
            <div className="text-sm text-zinc-400">
              You called {verdict(reveal.user.pick, fixture)} @{reveal.user.confidence}{" "}
              <span className={reveal.user.correct ? "text-emerald-400" : "text-rose-400"}>
                {reveal.user.correct == null ? "" : reveal.user.correct ? "HIT" : "MISS"}
              </span>
            </div>
          )}
          {reveal.lesson && (
            <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-3 text-sm text-emerald-300">
              🌱 EVA learned: {reveal.lesson.rule}
              <div className="text-xs text-emerald-400/80">→ {reveal.lesson.adjustment}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
