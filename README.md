<div align="center">

# EVA — The Sealed Oracle

**A World Cup forecaster who seals every prediction on-chain — and gets sharper because she remembers.**

Built on **Walrus Memory** + **Sui**.

</div>

---

Most prediction bots have no memory and no accountability: they forget what they
said, and you can never prove they didn't quietly rewrite a bad call. EVA fixes
both.

- **Sealed.** Before kickoff, EVA writes her prediction as an encrypted,
  timestamped memory on Walrus and publishes a SHA-256 commitment. After the
  match she reveals the plaintext — and anyone can re-hash to confirm she didn't
  change her mind. Cryptographic proof of no hindsight.
- **Self-correcting.** After every miss she runs a post-mortem, distills one
  transferable *lesson*, and stores it. Before her next call she recalls those
  lessons and applies them — so you can watch her get measurably better, on
  chain, the longer the tournament runs.

You can seal your own calls alongside hers and compete on an auditable
scoreboard.

> EVA scans matches for signal; her **memory is the seedling** — the proof that
> what was learned persists. (WALL·E earns and remembers; EVA predicts and
> remembers.)

## How Walrus Memory is used

Every prediction, distilled lesson, team dossier, and user-bias note is a
namespaced memory in EVA's `MemWalAccount` on Sui mainnet (encrypted blobs on
Walrus). At commit time EVA semantically **recalls** her relevant lessons,
dossiers, and past calls and feeds them into the next prediction; after each
result she **remembers** a new lesson and dossier update. The on-chain account is
the verifiable, portable record that makes her memory real — not a private log.

## Architecture

A single Next.js app on Vercel. Client components render the chat, scoreboard and
the "Day 1 vs Now" timeline; **server route handlers are the Brain** and hold all
secrets (the MemWal delegate key, the LLM key, the football key).

| Path | What |
| --- | --- |
| `lib/grade.ts` | 1X2 grading + 3-class Brier (tested) |
| `lib/commit.ts` | SHA-256 commit-reveal (tested) |
| `lib/memwal/` | namespaced Walrus Memory wrapper + memory text format (tested) |
| `lib/football/` | football-data.org client + manual override + fallback |
| `lib/ai/` | predict + post-mortem (Vercel AI SDK + Anthropic) |
| `app/` | UI + Brain route handlers |

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run verify:memwal        # checks credentials + pings the relayer
npm test                     # unit tests for the deterministic core
npm run dev
```

Create your Walrus Memory account + delegate key at <https://memory.walrus.xyz>
(use the staging dashboard for testnet). Get a free football key at
<https://www.football-data.org> (competition code `WC`).
