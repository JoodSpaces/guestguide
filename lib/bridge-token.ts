import { createHmac } from "crypto";

/**
 * A stay link for a website booking, derived — not random.
 *
 * Normal stay links are random nanoids whose plaintext exists only at creation,
 * so a retried "create" could never hand the same link back. Here the link is
 * HMAC(BRIDGE_TOKEN_KEY, booking ref), so the bridge is idempotent: the same
 * paid booking always yields the same link, the website can re-send the email
 * without storing a secret, and nothing in either database can reveal a link
 * (only its peppered hash is stored, as for every other token).
 *
 * 22 base64url characters = 132 bits, the same strength and alphabet as
 * lib/token.ts's generateToken(). `version` exists so a link can be re-issued
 * later without changing the booking ref.
 */

export const BRIDGE_REF_RE = /^JOOD-[A-Z0-9]{6}$/;
const MIN_KEY_LENGTH = 32;

export function deriveBridgeToken(key: string | undefined, ref: string, version = 0): string {
  if (!key || key.length < MIN_KEY_LENGTH) throw new Error("BRIDGE_TOKEN_KEY is not configured (32+ characters)");
  if (!BRIDGE_REF_RE.test(ref)) throw new Error("invalid booking reference");
  return createHmac("sha256", key).update(`stay:v${version}:${ref}`).digest("base64url").slice(0, 22);
}
