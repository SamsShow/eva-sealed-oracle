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

const label = (o: Outcome, f: Fixture) =>
  o === "HOME" ? f.homeTeam : o === "AWAY" ? f.awayTeam : "Draw";

function Verdict({ correct }: { correct: boolean | null }) {
  if (correct == null) return null;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={
        correct
          ? { background: "rgba(16,185,129,0.12)", color: "#047857" }
          : { background: "rgba(244,63,94,0.12)", color: "#be123c" }
      }
    >
      {correct ? "HIT" : "MISS"}
    </span>
  );
}

export function MatchCard({
  fixture,
  uid,
  onChanged,
}: {
  fixture: Fixture;
  uid: string;
  onChanged: () => void;
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
        body: JSON.stringify({ matchId: fixture.matchId, uid, user: { pick, confidence } }),
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
      onChanged();
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
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setPhase("sealed");
    }
  }

  const kickoff = new Date(fixture.kickoff);

  return (
    <div className="eva-card eva-card-hover rise p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-semibold tracking-tight">
          {fixture.homeTeam} <span className="text-faint font-normal">vs</span>{" "}
          {fixture.awayTeam}
        </h3>
        {fixture.stage && (
          <span className="shrink-0 rounded-full bg-[#eef1f6] px-2.5 py-0.5 text-[11px] font-medium text-muted">
            {fixture.stage}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-faint">
        {kickoff.toUTCString()}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {phase === "idle" && (
        <div className="mt-5 space-y-4">
          <div className="seg">
            {(["HOME", "DRAW", "AWAY"] as Outcome[]).map((o) => (
              <button
                key={o}
                data-active={pick === o}
                onClick={() => setPick(o)}
                type="button"
              >
                {label(o, fixture)}
              </button>
            ))}
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>Your confidence</span>
              <span className="mono font-semibold text-[color:var(--ink)]">
                {confidence}
              </span>
            </div>
            <input
              type="range"
              className="eva-range"
              min={0}
              max={100}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
            />
          </div>
          <button onClick={sealCalls} disabled={!pick} className="btn-primary w-full">
            Seal both calls
          </button>
        </div>
      )}

      {phase === "working" && (
        <div className="mt-5 flex items-center gap-2 text-sm text-[color:var(--accent)]">
          <span className="eva-eye h-2 w-6 rounded-full" />
          EVA is scanning…
        </div>
      )}

      {phase === "sealed" && seal && (
        <div className="sealed mt-5 space-y-4">
          <div className="rounded-2xl border border-[rgba(37,99,235,0.12)] bg-[rgba(37,99,235,0.04)] p-4">
            <div className="text-sm font-medium text-[color:var(--accent)]">
              🔒 EVA&apos;s prophecy is sealed
            </div>
            <div className="mono mt-1 break-all text-[11px] text-faint">
              commit {seal.commitmentHash.slice(0, 28)}…
            </div>
            <span className={`seal-chip mt-2 ${seal.sealedBeforeKickoff ? "seed-chip" : ""}`}>
              {seal.sealedBeforeKickoff ? "✓ sealed before kickoff" : "⚠ sealed after kickoff"}
            </span>
          </div>
          <div className="text-sm text-muted">
            Your call:{" "}
            <span className="font-semibold" style={{ color: "var(--user)" }}>
              {label(seal.userPick, fixture)}
            </span>{" "}
            @{seal.userConfidence}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={home}
              onChange={(e) => setHome(e.target.value)}
              placeholder={fixture.homeCode}
              inputMode="numeric"
              className="w-14 rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5 text-center text-sm"
            />
            <span className="text-faint">–</span>
            <input
              value={away}
              onChange={(e) => setAway(e.target.value)}
              placeholder={fixture.awayCode}
              inputMode="numeric"
              className="w-14 rounded-lg border border-[color:var(--line)] bg-white px-2 py-1.5 text-center text-sm"
            />
            <button onClick={resolveReveal} className="btn-primary btn-seed ml-auto">
              Resolve &amp; reveal
            </button>
          </div>
          <p className="text-[11px] text-faint">
            Leave scores blank to use the live feed, or enter them to resolve
            manually.
          </p>
        </div>
      )}

      {phase === "revealed" && reveal && (
        <div className="rise mt-5 space-y-4">
          {reveal.result && (
            <div className="text-center text-2xl font-semibold tracking-tight tabular-nums">
              {fixture.homeCode}{" "}
              <span className="text-[color:var(--ink)]">{reveal.result.homeScore}</span>
              <span className="mx-2 text-faint">–</span>
              <span className="text-[color:var(--ink)]">{reveal.result.awayScore}</span>{" "}
              {fixture.awayCode}
            </div>
          )}
          {reveal.eva && (
            <div className="rounded-2xl border border-[rgba(37,99,235,0.12)] bg-[rgba(37,99,235,0.04)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[color:var(--accent)]">
                  EVA called {label(reveal.eva.pick, fixture)} @{reveal.eva.confidence}
                </span>
                <Verdict correct={reveal.eva.correct} />
              </div>
              <p className="mt-1.5 text-sm text-muted">{reveal.eva.reasoning}</p>
              {reveal.eva.appliedLessons.length > 0 && (
                <div className="mt-2 text-xs text-[color:var(--seed)]">
                  Lessons applied: {reveal.eva.appliedLessons.join("; ")}
                </div>
              )}
              <div className="mono mt-2 text-[11px] text-faint">
                {reveal.eva.verified
                  ? "✓ commitment verified — no hindsight"
                  : "✗ commitment mismatch"}
              </div>
            </div>
          )}
          {reveal.user && (
            <div className="flex items-center gap-2 text-sm text-muted">
              You called{" "}
              <span className="font-semibold" style={{ color: "var(--user)" }}>
                {label(reveal.user.pick, fixture)}
              </span>{" "}
              @{reveal.user.confidence}
              <Verdict correct={reveal.user.correct} />
            </div>
          )}
          {reveal.lesson && (
            <div className="rounded-2xl border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.06)] p-4 text-sm">
              <div className="font-medium text-[color:var(--seed)]">
                🌱 EVA learned
              </div>
              <div className="mt-1 text-[color:var(--ink)]">{reveal.lesson.rule}</div>
              <div className="mt-0.5 text-xs text-muted">→ {reveal.lesson.adjustment}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
