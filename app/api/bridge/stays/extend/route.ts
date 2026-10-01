import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { BRIDGE_REF_RE } from "@/lib/bridge-token";
import { cairoToUtcIso } from "@/lib/cairo-time";
import { readBridgeRequest } from "@/lib/bridge-request";
import { planExtend } from "@/lib/bridge-extend";

/**
 * POST /api/bridge/stays/extend — the website says extra nights were paid for a stay it sent us earlier (or that their payment
 * was refunded). Moves that stay's check-out: the cleaning task, the door-code window and the stay link all follow `check_out`.
 * Idempotent, signed like the other bridge calls.
 *
 *   200 { ok, changed, checkOut }
 *   404 not_found             no such stay here yet (the website retries until it arrives)
 *   409 date_conflict         the extra nights overlap another stay here
 *   409 cancelled | already_completed | unexpected_dates | superseded   needs a person
 */
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const schema = z.object({
  action: z.enum(["extend", "revert"]),
  ref: z.string().regex(BRIDGE_REF_RE),
  childRef: z.string().regex(BRIDGE_REF_RE),
  from: z.string().regex(DATE),
  to: z.string().regex(DATE),
});

export async function POST(req: NextRequest) {
  const auth = await readBridgeRequest(req);
  if (!auth.ok) return auth.res;

  let parsed;
  try { parsed = schema.safeParse(JSON.parse(auth.raw)); } catch { return NextResponse.json({ error: "validation_error" }, { status: 400 }); }
  if (!parsed.success || parsed.data.to <= parsed.data.from || parsed.data.ref === parsed.data.childRef) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const d = parsed.data;
  const supabase = createServiceClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, check_out, property_id, properties(checkout_time)")
    .eq("source", "direct")
    .eq("external_ref", d.ref)
    .maybeSingle<{ id: string; status: string; check_out: string; property_id: string; properties: { checkout_time: string } | { checkout_time: string }[] | null }>();
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const plan = planExtend({ action: d.action, status: booking.status, currentCheckOut: booking.check_out, from: d.from, to: d.to });
  if (plan.kind === "refuse") return NextResponse.json({ error: plan.error }, { status: 409 });
  if (plan.kind === "noop") return NextResponse.json({ ok: true, changed: false, checkOut: booking.check_out });

  const prop = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
  const newIso = cairoToUtcIso(plan.toDate, prop?.checkout_time ?? "11:00");

  if (d.action === "extend") {
    const { data: overlaps } = await supabase
      .from("bookings")
      .select("id, check_in, check_out")
      .eq("property_id", booking.property_id)
      .neq("id", booking.id)
      .in("status", ["confirmed", "completed"])
      .lt("check_in", newIso)
      .gt("check_out", booking.check_out)
      .limit(1)
      .returns<{ id: string; check_in: string; check_out: string }[]>();
    if (overlaps && overlaps.length > 0) {
      return NextResponse.json(
        { error: "date_conflict", message: `Overlaps a confirmed stay here (${overlaps[0].check_in.slice(0, 10)} → ${overlaps[0].check_out.slice(0, 10)})` },
        { status: 409 },
      );
    }
  }

  const { error } = await supabase.from("bookings").update({ check_out: newIso }).eq("id", booking.id);
  if (error) {
    console.error("[bridge/extend] update failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  // The guest's link keeps working for 48 h after the (new) check-out.
  await supabase.from("stay_tokens").update({ expires_at: new Date(new Date(newIso).getTime() + 48 * 3600 * 1000).toISOString() }).eq("booking_id", booking.id).is("revoked_at", null);
  await supabase.from("audit_log").insert({
    actor_type: "system", actor_id: null, action: d.action === "extend" ? "booking_extended" : "booking_extension_reverted",
    entity: "bookings", entity_id: booking.id, meta: { via: "website_bridge", ref: d.ref, childRef: d.childRef, from: d.from, to: d.to },
  });
  return NextResponse.json({ ok: true, changed: true, checkOut: newIso });
}
