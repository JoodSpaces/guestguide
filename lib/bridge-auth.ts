import { createHmac, timingSafeEqual } from "crypto";

/**
 * Server-to-server auth for the website → Guest App bridge.
 *
 * The website's `stay-bridge` Edge Function signs each request:
 *
 *   x-jood-timestamp: <unix seconds>
 *   x-jood-signature: hex( HMAC-SHA256( secret, `${timestamp}.${METHOD}.${path}.${rawBody}` ) )
 *
 * Method and path are inside the signature so a captured "create" call cannot be
 * replayed against "cancel". The timestamp bounds replay to a few minutes, and
 * every endpoint is idempotent anyway. supabase/functions/_shared/bridge.ts in the
 * website repo implements the same function; both suites assert the same vector.
 */

export const BRIDGE_MAX_SKEW_SECONDS = 300;
const MIN_SECRET_LENGTH = 32;

export function bridgeSignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${method.toUpperCase()}.${path}.${body}`)
    .digest("hex");
}

export type BridgeVerdict =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "missing_headers" | "stale" | "bad_signature" };

export function verifyBridgeRequest(input: {
  secret: string | undefined;
  timestamp: string | null;
  signature: string | null;
  method: string;
  path: string;
  body: string;
  nowMs?: number;
}): BridgeVerdict {
  // An unset or weak secret must never validate anything.
  if (!input.secret || input.secret.length < MIN_SECRET_LENGTH) return { ok: false, reason: "not_configured" };
  if (!input.timestamp || !input.signature) return { ok: false, reason: "missing_headers" };

  const ts = Number(input.timestamp);
  const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > BRIDGE_MAX_SKEW_SECONDS) return { ok: false, reason: "stale" };

  const expected = bridgeSignature(input.secret, input.timestamp, input.method, input.path, input.body);
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "bad_signature" };
  return { ok: true };
}
