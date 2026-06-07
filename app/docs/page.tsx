import type { Metadata } from "next";
import Link from "next/link";
import { EvaMark } from "@/components/EvaMark";

export const metadata: Metadata = {
  title: "How EVA works",
  description:
    "How EVA seals predictions on-chain, grades them, and gets sharper because she remembers — powered by Walrus Memory.",
};

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="eva-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--accent)] text-sm font-semibold text-white">
          {n}
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function NS({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[color:var(--line)] py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:gap-3">
      <code className="mono shrink-0 text-[12px] text-[color:var(--accent)]">
        {name}
      </code>
      <span className="text-sm text-muted">{desc}</span>
    </div>
  );
}

export default function Docs() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="rise flex items-center justify-between">
        <div className="flex items-center gap-4">
          <EvaMark size={44} />
          <div>
            <p className="text-[11px] font-medium tracking-[0.28em] text-[color:var(--accent)]">
              HOW IT WORKS
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">EVA</h1>
          </div>
        </div>
        <Link
          href="/"
          className="text-sm text-[color:var(--accent)] hover:underline"
        >
          ← Back to the oracle
        </Link>
      </header>

      <p className="rise mt-6 text-[15px] leading-relaxed text-muted">
        EVA is <strong className="text-[color:var(--ink)]">The Sealed Oracle</strong> — a
        World Cup forecaster that seals every prediction on-chain{" "}
        <em>before</em> kickoff and gets measurably sharper over the tournament,
        because she remembers what she got wrong. The longer it runs, the better
        she gets — and you can prove it.
      </p>

      {/* The loop */}
      <h2 className="mt-10 mb-4 text-xs font-medium tracking-[0.18em] text-faint">
        THE LOOP
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Step n={1} title="Commit — she seals">
          Before kickoff, EVA recalls her past lessons, team dossiers and prior
          calls, makes a prediction (pick + confidence + reasoning), and{" "}
          <strong className="text-[color:var(--ink)]">seals it to Walrus</strong>{" "}
          as an encrypted, timestamped blob. You seal your own call too.
        </Step>
        <Step n={2} title="Resolve — she's graded">
          When the result is in, EVA grades both calls: a hit/miss plus a{" "}
          <strong className="text-[color:var(--ink)]">Brier score</strong> that
          measures calibration (lower is better).
        </Step>
        <Step n={3} title="Learn — she distills a lesson">
          On a miss, EVA runs a post-mortem and writes <em>one transferable
          lesson</em> to Walrus (e.g. &ldquo;cap confidence on home favourites vs
          organized low blocks&rdquo;), plus updated team dossiers.
        </Step>
        <Step n={4} title="Apply — she recalls it">
          Her next prediction recalls those lessons and{" "}
          <strong className="text-[color:var(--ink)]">visibly adjusts</strong> —
          the &ldquo;Lessons applied&rdquo; line shows memory changing her call.
        </Step>
      </div>

      {/* Sealed prophecies */}
      <h2 className="mt-10 mb-4 text-xs font-medium tracking-[0.18em] text-faint">
        SEALED PROPHECIES — PROOF OF NO HINDSIGHT
      </h2>
      <div className="eva-card p-6 text-sm leading-relaxed text-muted">
        <p>
          Each prediction is a <strong className="text-[color:var(--ink)]">commit-reveal</strong>{" "}
          scheme. At commit time EVA publishes a SHA-256{" "}
          <span className="seal-chip">commitment hash</span> of her prediction +
          a random nonce, and the encrypted blob is timestamped on-chain{" "}
          <em>before</em> kickoff. The hash leaks nothing about the pick.
        </p>
        <p className="mt-3">
          After the match she <strong className="text-[color:var(--ink)]">reveals</strong>{" "}
          the plaintext + nonce. Because the immutable blob provably predates
          kickoff, anyone can re-hash and confirm she didn&apos;t change her call
          — cryptographic proof of no hindsight. No editing, no &ldquo;I always
          said so.&rdquo;
        </p>
      </div>

      {/* What's on Walrus */}
      <h2 className="mt-10 mb-4 text-xs font-medium tracking-[0.18em] text-faint">
        WHAT LIVES ON WALRUS
      </h2>
      <div className="eva-card p-6">
        <p className="mb-3 text-sm leading-relaxed text-muted">
          Every memory is an encrypted blob in EVA&apos;s{" "}
          <strong className="text-[color:var(--ink)]">MemWalAccount</strong> on Sui
          mainnet, organized by namespace. In the live memory panel, each entry
          links to its blob on Walruscan.
        </p>
        <NS name="eva:predictions" desc="every sealed prediction (the proof blobs)" />
        <NS name="eva:lessons" desc="distilled, transferable lessons from her misses" />
        <NS name="eva:dossier:{TEAM}" desc="evolving scouting notes per team" />
        <NS name="eva:scoreboard" desc="graded outcomes (hit/miss + Brier)" />
        <NS name="user:{id}:…" desc="your own predictions and record" />
      </div>

      {/* Getting sharper */}
      <h2 className="mt-10 mb-4 text-xs font-medium tracking-[0.18em] text-faint">
        GETTING SHARPER (THE MEMORY MOMENT)
      </h2>
      <div className="eva-card p-6 text-sm leading-relaxed text-muted">
        <p>
          On day one EVA has no lessons — her calls are raw priors. After a few
          days of real matches, the{" "}
          <strong className="text-[color:var(--ink)]">&ldquo;Day 1 → Now&rdquo;</strong>{" "}
          panel shows her Brier trending down and her predictions citing the exact
          lessons she learned. That before/after is only possible because memory
          is doing real work — not just logging.
        </p>
        <p className="mt-3">
          You compete alongside her: seal your own calls and the{" "}
          <strong className="text-[color:var(--ink)]">duel</strong> tracks who&apos;s
          better calibrated.
        </p>
      </div>

      {/* Under the hood */}
      <h2 className="mt-10 mb-4 text-xs font-medium tracking-[0.18em] text-faint">
        UNDER THE HOOD
      </h2>
      <div className="eva-card p-6 text-sm leading-relaxed text-muted">
        <ul className="space-y-2">
          <li>
            <strong className="text-[color:var(--ink)]">Memory:</strong> Walrus
            Memory (MemWal) — encrypted blobs on Walrus, ownership + a delegate
            key on a Sui MemWalAccount, semantic recall.
          </li>
          <li>
            <strong className="text-[color:var(--ink)]">Brain:</strong> a Next.js
            app whose server route handlers hold the keys and run the loop;
            reasoning by a local LLM over an OpenAI-compatible endpoint.
          </li>
          <li>
            <strong className="text-[color:var(--ink)]">Match data:</strong> real
            World Cup 2026 fixtures &amp; live results from a free football API,
            with a manual override.
          </li>
          <li>
            <strong className="text-[color:var(--ink)]">Provenance:</strong> the
            MemWalAccount is viewable on a Sui explorer; every memory blob on
            Walruscan.
          </li>
        </ul>
      </div>

      <div className="mt-10 border-t border-[color:var(--line)] pt-6 text-sm">
        <Link href="/" className="text-[color:var(--accent)] hover:underline">
          ← Back to the oracle
        </Link>
      </div>
    </main>
  );
}
