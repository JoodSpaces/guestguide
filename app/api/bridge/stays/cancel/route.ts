import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { BRIDGE_REF_RE } from "@/lib/bridge-token";
import { readBridgeRequest } from "@/lib/bridge-request";

/**
 * POST /api/bridge/stays/cancel — the website says a paid booking was cancelled or refunded.
 *
 * Marks the stay cancelled, revokes its guest link (so the door code and everything
 * behind it go dark at once) and removes the not-yet-started cleaning task.
 * Idempotent. A stay that has already completed is not touched (409): that needs a human.
 *
 *   200 { ok: true, alreadyCancelled }
 *   404 not_found            nothing here for that ref (nothing to undo; the website treats it as done)
 *   409 already_completed
 */
const schema = z.object({ ref: z.string().regex(BRIDGE_REF_RE) });

export async function POST(req: NextRequest) {
  const auth = await readBridgeRequest(req);
  if (!auth.ok) return auth.res;

  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(auth.raw));
  } catch {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("source", "direct")
    .eq("external_ref", parsed.data.ref)
    .maybeSingle<{ id: string; status: string }>();

  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (booking.status === "completed") return NextResponse.json({ error: "already_completed" }, { status: 409 });

  const now = new Date().toISOString();
  const alreadyCancelled = booking.status === "cancelled";

  if (!alreadyCancelled) {
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    if (error) {
      console.error("[bridge/cancel] update failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }
  // Always (re)apply the revoke + cleanup so a half-finished earlier attempt heals.
  await supabase.from("stay_tokens").update({ revoked_at: now }).eq("booking_id", booking.id).is("revoked_at", null);
  await supabase.from("turnover_tasks").delete().eq("booking_id", booking.id).eq("status", "scheduled");

  if (!alreadyCancelled) {
    await supabase.from("audit_log").insert({
      actor_type: "system",
      actor_id: null,
      action: "booking_cancelled",
      entity: "bookings",
      entity_id: booking.id,
      meta: { via: "website_bridge", ref: parsed.data.ref },
    });
  }
  return NextResponse.json({ ok: true, alreadyCancelled });
}
