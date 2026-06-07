import { NextResponse } from "next/server";

/**
 * Optional shared-secret guard. If EVA_BRAIN_SECRET is set, the caller must
 * present it (header `x-eva-secret` or `Authorization: Bearer`). If it's unset
 * the endpoint is open — convenient for the local single-user demo.
 */
export function checkSecret(req: Request): boolean {
  const secret = process.env.EVA_BRAIN_SECRET;
  if (!secret) return true;
  return (
    req.headers.get("x-eva-secret") === secret ||
    req.headers.get("authorization") === `Bearer ${secret}`
  );
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
