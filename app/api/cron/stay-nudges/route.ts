import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { cairoDay } from "@/lib/cairo-time";
import { sendPush } from "@/lib/push";
import { pickNudge, nudgeText, type NudgeKind } from "@/lib/stay-nudges";

/**
 * Daily (Vercel cron, ~18:00 Cairo). Sends each due nudge once to the devices a guest has allowed notifications on.
 * Needs CRON_SECRET (Vercel sends it as a bearer token); without it the route refuses everything.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const now = Date.now();
  const lo = cairoDay(now - 24 * 3600 * 1000).startIso, hi = cairoDay(now + 24 * 3600 * 1000).endIso;

  type Row = { id: string; guest_lang: string | null; check_in: string; check_out: string; status: string; dnd_active: boolean; properties: { checkout_time: string | null } | { checkout_time: string | null }[] | null };
  const { data: rows, error } = await supabase.from("bookings")
    .select("id, guest_lang, check_in, check_out, status, dnd_active, properties(checkout_time)")
    .neq("status", "cancelled").lte("check_in", hi).gte("check_out", lo).limit(500).returns<Row[]>();
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });
  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) return NextResponse.json({ ok: true, sent: 0 });

  // Missing tables/columns (migration 034 not applied yet) must mean "send nothing", not an error page.
  const [{ data: sent, error: sentErr }, { data: calls }, { data: subs, error: subErr }] = await Promise.all([
    supabase.from("stay_nudges").select("booking_id, kind").in("booking_id", ids).returns<{ booking_id: string; kind: NudgeKind }[]>(),
    supabase.from("voice_sessions").select("booking_id, actions").in("booking_id", ids).returns<{ booking_id: string; actions: string[] }[]>(),
    supabase.from("push_subscriptions").select("id, booking_id, endpoint, p256dh, auth, stay_path").in("booking_id", ids)
      .returns<{ id: string; booking_id: string; endpoint: string; p256dh: string; auth: string; stay_path: string | null }[]>(),
  ]);
  if (sentErr || subErr) return NextResponse.json({ ok: true, sent: 0, note: "migration 034 not applied" });

  let count = 0;
  for (const r of rows ?? []) {
    const mine = (subs ?? []).filter((s) => s.booking_id === r.id);
    if (!mine.length) continue;
    const prop = Array.isArray(r.properties) ? r.properties[0] : r.properties;
    const kind = pickNudge({
      id: r.id, guestLang: r.guest_lang, checkIn: r.check_in, checkOut: r.check_out, status: r.status, dnd: r.dnd_active,
      checkoutTime: prop?.checkout_time ?? null,
      askedLateCheckout: (calls ?? []).some((c) => c.booking_id === r.id && c.actions.includes("lookup:check_late_checkout")),
      alreadySent: (sent ?? []).filter((s) => s.booking_id === r.id).map((s) => s.kind),
    }, now);
    if (!kind) continue;
    // Claim it first: if two runs overlap, only one gets past the primary key.
    const { error: claim } = await supabase.from("stay_nudges").insert({ booking_id: r.id, kind });
    if (claim) continue;
    const msg = nudgeText(kind, r.guest_lang, prop?.checkout_time ?? null);
    const expired: string[] = [];
    await Promise.all(mine.map(async (s) => {
      const res = await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, { ...msg, url: s.stay_path ?? "/", tag: `nudge-${kind}` });
      if (res === "expired") expired.push(s.id);
    }));
    if (expired.length) await supabase.from("push_subscriptions").delete().in("id", expired);
    count++;
  }
  return NextResponse.json({ ok: true, sent: count });
}
