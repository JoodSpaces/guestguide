import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { readBridgeRequest } from "@/lib/bridge-request";
import { loadTowerSnapshot } from "@/lib/tower-snapshot";

/**
 * GET /api/bridge/tower-snapshot — the website's Control Tower asks for a read-only picture of operations and safety.
 * Same signed-request scheme as the rest of the bridge (method and path are inside the signature). The reply has no guest
 * names, contact details, door codes or message text. Nothing here writes anything.
 */
export async function GET(req: NextRequest) {
  const auth = await readBridgeRequest(req);
  if (!auth.ok) return auth.res;
  try {
    return NextResponse.json(await loadTowerSnapshot(createServiceClient()), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[tower-snapshot] failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
