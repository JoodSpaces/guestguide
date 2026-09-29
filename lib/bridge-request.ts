import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeRequest } from "@/lib/bridge-auth";

const MAX_BODY_BYTES = 20_000;

/**
 * Read + authenticate a bridge request. Returns the raw body on success, or the
 * response to send. Failures are deliberately uninformative (401 for anything
 * auth-related) so the endpoint does not help someone probing it.
 */
export async function readBridgeRequest(
  req: NextRequest,
): Promise<{ ok: true; raw: string } | { ok: false; res: NextResponse }> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return { ok: false, res: NextResponse.json({ error: "too_large" }, { status: 413 }) };

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return { ok: false, res: NextResponse.json({ error: "too_large" }, { status: 413 }) };

  const verdict = verifyBridgeRequest({
    secret: process.env.BRIDGE_SHARED_SECRET,
    timestamp: req.headers.get("x-jood-timestamp"),
    signature: req.headers.get("x-jood-signature"),
    method: req.method,
    path: req.nextUrl.pathname,
    body: raw,
  });
  if (!verdict.ok) {
    if (verdict.reason === "not_configured") console.error("[bridge] BRIDGE_SHARED_SECRET is not set (32+ chars)");
    else console.warn("[bridge] rejected request:", verdict.reason);
    return { ok: false, res: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { ok: true, raw };
}
