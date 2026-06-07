#!/usr/bin/env tsx
/**
 * Sanity-check EVA's Walrus Memory credentials before running the app.
 *   npm run verify:memwal
 * Reads .env.local then .env (no external deps), validates the delegate key
 * format, derives its public key, and (if set) checks it against the dashboard
 * public key and pings the relayer.
 */

import { readFileSync } from "node:fs";
import { delegateKeyToPublicKey, MemWal } from "@mysten-incubation/memwal";

const HEX_32 = /^(0x)?[0-9a-fA-F]{64}$/;
const ACCOUNT_ID = /^0x[0-9a-fA-F]{64}$/;
const norm = (v: string) => v.trim().replace(/^0x/i, "").toLowerCase();

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // file absent — fine
    }
  }
}

async function main() {
  loadEnv();
  const privateKey = process.env.MEMWAL_PRIVATE_KEY ?? "";
  const accountId = process.env.MEMWAL_ACCOUNT_ID ?? "";
  const expectedPub = process.env.MEMWAL_DELEGATE_PUBLIC_KEY ?? "";
  const serverUrl = process.env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz";

  if (!HEX_32.test(privateKey)) {
    throw new Error("MEMWAL_PRIVATE_KEY must be a 64-char Ed25519 hex key");
  }
  if (accountId && !ACCOUNT_ID.test(accountId)) {
    throw new Error("MEMWAL_ACCOUNT_ID must be a 0x-prefixed 32-byte Sui object id");
  }

  const derived = Buffer.from(await delegateKeyToPublicKey(norm(privateKey))).toString("hex");
  if (expectedPub && norm(expectedPub) !== derived) {
    throw new Error(
      "MEMWAL_PRIVATE_KEY does not derive MEMWAL_DELEGATE_PUBLIC_KEY — wrong key or wrong account.",
    );
  }

  console.log("✓ Credentials parse.");
  console.log(`  delegate public key: ${derived}`);
  if (accountId) console.log(`  account id:          ${accountId}`);
  console.log(`  relayer:             ${serverUrl}`);

  if (accountId) {
    const memwal = MemWal.create({ key: privateKey, accountId, serverUrl });
    const health = await memwal.health();
    console.log(`✓ Relayer healthy: ${JSON.stringify(health)}`);
  } else {
    console.log("• Set MEMWAL_ACCOUNT_ID to also ping the relayer.");
  }
}

main().catch((err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
