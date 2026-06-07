"use client";

import { useEffect, useState } from "react";

type Rec = {
  record: Record<string, unknown>;
  text: string;
  blobId: string;
  distance: number;
};

interface Snapshot {
  account: string | null;
  predictions: { eva: Rec[]; user: Rec[] };
  lessons: Rec[];
  dossiers: Rec[];
  outcomes: { eva: Rec[]; user: Rec[] };
  total: number;
}

/** Strip the JSON tail so we show the human lead sentence. */
function lead(text: string): string {
  const i = text.lastIndexOf(" {");
  return (i > 0 ? text.slice(0, i) : text).trim();
}

function Row({ item, dot }: { item: Rec; dot: string }) {
  return (
    <li className="rounded-xl border border-[color:var(--line)] bg-white/70 p-3">
      <div className="flex gap-2">
        <span
          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: dot }}
        />
        <p className="text-[13px] leading-snug text-[color:var(--ink)] line-clamp-3">
          {lead(item.text)}
        </p>
      </div>
      <a
        href={`https://walruscan.com/mainnet/blob/${item.blobId}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`View on Walruscan: ${item.blobId}`}
        className="mono mt-1.5 ml-3.5 inline-block text-[10px] text-[color:var(--accent)] hover:underline"
      >
        walrus:{item.blobId.slice(0, 14)}… ↗
      </a>
    </li>
  );
}

function Section({
  title,
  ns,
  items,
  dot,
}: {
  title: string;
  ns: string;
  items: Rec[];
  dot: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold tracking-wide text-[color:var(--ink)]">
          {title} <span className="text-faint">· {items.length}</span>
        </h3>
        <span className="mono text-[10px] text-faint">{ns}</span>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <Row key={`${it.blobId}-${i}`} item={it} dot={dot} />
        ))}
      </ul>
    </div>
  );
}

export function MemoryPanel({
  uid,
  refreshKey,
}: {
  uid: string;
  refreshKey: number;
}) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/memory?uid=${uid}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "failed");
        if (alive) setSnap(data as Snapshot);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid, refreshKey]);

  const explorer = snap?.account
    ? `https://suiscan.xyz/mainnet/object/${snap.account}`
    : null;

  return (
    <div className="eva-card flex max-h-[calc(100vh-3rem)] flex-col p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--seed)]" />
          <h2 className="text-[11px] font-medium tracking-[0.18em] text-faint">
            WALRUS MEMORY
          </h2>
        </div>
        <span className="seal-chip seed-chip">
          {snap ? `${snap.total} memories` : loading ? "syncing…" : "—"}
        </span>
      </div>

      {explorer && (
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="mono mt-1 text-[10px] text-[color:var(--accent)] hover:underline"
        >
          {snap?.account?.slice(0, 12)}…{snap?.account?.slice(-6)} ↗
        </a>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-faint">
        Everything EVA stores &amp; analyzes — encrypted blobs on Walrus,
        recalled live before each call.
      </p>

      <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {snap && snap.total === 0 && !error && (
          <p className="text-sm text-muted">
            No memories yet. Seal a call and watch EVA&apos;s brain fill up.
          </p>
        )}
        {snap && (
          <>
            <Section
              title="🔮 EVA predictions"
              ns="eva:predictions"
              items={snap.predictions.eva}
              dot="var(--accent)"
            />
            <Section
              title="🌱 Lessons learned"
              ns="eva:lessons"
              items={snap.lessons}
              dot="var(--seed)"
            />
            <Section
              title="🔭 Team dossiers"
              ns="eva:dossier:*"
              items={snap.dossiers}
              dot="#64748b"
            />
            <Section
              title="🏁 Graded outcomes"
              ns="eva:scoreboard"
              items={snap.outcomes.eva}
              dot="#0ea5e9"
            />
            <Section
              title="🙋 Your predictions"
              ns="user:*:predictions"
              items={snap.predictions.user}
              dot="var(--user)"
            />
          </>
        )}
      </div>
    </div>
  );
}
