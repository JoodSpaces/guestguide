import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { readBridgeRequest } from "@/lib/bridge-request";
import { generateToken, hashToken } from "@/lib/token";
import { sendPushToBooking } from "@/lib/push";

/**
 * POST /api/bridge/desk — the website's admin panel runs the "Guest desk" through this: guest requests, maintenance tickets and stay
 * links, read and acted on from one place. Same signed-request scheme as the rest of the bridge (method, path and body are inside the
 * signature), so only the website's own function can call it, and it only ever does so for a signed-in JOOD admin.
 *
 * The reply carries guest names and request text (this is the staff screen), but never door codes, phone numbers, emails or payment
 * details. Service requests (the paid extras) are read-only here: approving and charging them stays in the Guest App's own admin.
 *
 *   { action: "overview" }
 *   { action: "request_update", id, status?: received|in_progress|resolved, adminNotes?: string|null }
 *   { action: "ticket_update", id, status?: open|in_progress|resolved, priority?, assignedTo?, resolutionNotes?, resolvedBy? }
 *   { action: "ticket_create", propertyId, title, description?, category, priority, bookingId? }
 *   { action: "stay_link", bookingId }
 */
const UUID = z.string().uuid();
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("overview") }),
  z.object({ action: z.literal("request_update"), id: UUID, status: z.enum(["received", "in_progress", "resolved"]).optional(), adminNotes: z.string().max(1000).nullable().optional() }),
  z.object({ action: z.literal("ticket_update"), id: UUID, status: z.enum(["open", "in_progress", "resolved"]).optional(), priority: z.enum(["urgent", "normal", "low"]).optional(),
    assignedTo: z.string().max(100).nullable().optional(), resolutionNotes: z.string().max(2000).nullable().optional(), resolvedBy: z.string().max(100).nullable().optional() }),
  z.object({ action: z.literal("ticket_create"), propertyId: UUID, bookingId: UUID.optional(), title: z.string().min(1).max(200), description: z.string().max(2000).optional(),
    category: z.enum(["plumbing", "electrical", "ac", "appliance", "furniture", "pool", "structural", "general"]), priority: z.enum(["urgent", "normal", "low"]) }),
  z.object({ action: z.literal("stay_link"), bookingId: UUID }),
]);

const PUSH_MSG: Record<string, { en: string; ar: string }> = {
  in_progress: { en: "We're on it! 🛎️", ar: "جارٍ المعالجة! 🛎️" },
  resolved: { en: "Your request is resolved ✓", ar: "تم حل طلبك ✓" },
};

function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const dep = process.env.VERCEL_URL;
  if (dep) return `https://${dep}`;
  return configured || "http://localhost:3000";
}
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);
type BookingEmbed = { guest_first_name: string; guest_last_name: string; check_in?: string; check_out?: string; guest_lang?: string; property_id?: string; properties?: { name: string } | { name: string }[] | null };

export async function POST(req: NextRequest) {
  const auth = await readBridgeRequest(req);
  if (!auth.ok) return auth.res;
  let parsed;
  try { parsed = schema.safeParse(JSON.parse(auth.raw || "{}")); } catch { return NextResponse.json({ error: "validation_error" }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });
  const d = parsed.data;
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  try {
    if (d.action === "overview") {
      const since = new Date(Date.now() - 45 * 86400000).toISOString();
      const [gr, sr, tk, st] = await Promise.all([
        supabase.from("guest_requests").select("id, category, body, urgency, status, admin_notes, created_at, updated_at, booking_id, bookings(guest_first_name, guest_last_name, check_in, check_out, guest_lang, properties(name))").gte("created_at", since).order("created_at", { ascending: false }).limit(120),
        supabase.from("service_requests").select("id, status, quantity, guest_notes, created_at, services(name_en, price_egp), bookings(guest_first_name, guest_last_name, properties(name))").gte("created_at", since).order("created_at", { ascending: false }).limit(60),
        supabase.from("maintenance_tickets").select("id, title, description, category, priority, status, assigned_to, resolution_notes, created_at, updated_at, resolved_at, property_id, booking_id, properties(id, name)").order("created_at", { ascending: false }).limit(150),
        supabase.from("bookings").select("id, status, source, external_ref, check_in, check_out, guest_first_name, guest_last_name, guest_lang, property_id, properties(name)").neq("status", "cancelled").gte("check_out", new Date(Date.now() - 2 * 86400000).toISOString()).order("check_in", { ascending: true }).limit(120),
      ]);
      const bookings = (st.data ?? []) as Array<{ id: string }>;
      const toks = bookings.length ? await supabase.from("stay_tokens").select("booking_id, issued_at, expires_at, revoked_at").in("booking_id", bookings.map((b) => b.id)).is("revoked_at", null) : { data: [] as Array<{ booking_id: string; issued_at: string; expires_at: string }> };
      const hasLink = new Map((toks.data ?? []).map((t) => [t.booking_id, t]));
      const guestName = (b: BookingEmbed | null) => (b ? `${b.guest_first_name} ${b.guest_last_name}`.trim() : "Guest");
      return NextResponse.json({
        ok: true, app: appUrl(),
        guestRequests: (gr.data ?? []).map((r) => { const b = one((r as { bookings: BookingEmbed | BookingEmbed[] | null }).bookings); return { id: r.id, category: r.category, body: r.body, urgency: r.urgency, status: r.status, adminNotes: r.admin_notes, createdAt: r.created_at, updatedAt: r.updated_at, bookingId: r.booking_id, guest: guestName(b), property: one(b?.properties ?? null)?.name ?? "", checkIn: b?.check_in ?? null, checkOut: b?.check_out ?? null, lang: b?.guest_lang ?? "en" }; }),
        serviceRequests: (sr.data ?? []).map((r) => { const b = one((r as { bookings: BookingEmbed | BookingEmbed[] | null }).bookings), s = one((r as { services: { name_en: string; price_egp: number } | { name_en: string; price_egp: number }[] | null }).services); return { id: r.id, status: r.status, quantity: r.quantity, notes: r.guest_notes, createdAt: r.created_at, service: s?.name_en ?? "Service", price: s?.price_egp ?? null, guest: guestName(b), property: one(b?.properties ?? null)?.name ?? "" }; }),
        tickets: (tk.data ?? []).map((t) => ({ id: t.id, title: t.title, description: t.description, category: t.category, priority: t.priority, status: t.status, assignedTo: t.assigned_to, resolutionNotes: t.resolution_notes, createdAt: t.created_at, updatedAt: t.updated_at, resolvedAt: t.resolved_at, propertyId: t.property_id, bookingId: t.booking_id, property: one((t as { properties: { id: string; name: string } | { id: string; name: string }[] | null }).properties)?.name ?? "" })),
        stays: (st.data ?? []).map((b) => { const tok = hasLink.get(b.id); return { id: b.id, status: b.status, source: b.source, ref: b.external_ref, checkIn: b.check_in, checkOut: b.check_out, guest: `${b.guest_first_name} ${b.guest_last_name}`.trim(), lang: b.guest_lang, propertyId: b.property_id, property: one((b as { properties: { name: string } | { name: string }[] | null }).properties)?.name ?? "", linkIssuedAt: tok?.issued_at ?? null, linkExpiresAt: tok?.expires_at ?? null }; }),
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (d.action === "request_update") {
      const updates: Record<string, unknown> = { updated_at: now };
      if (d.status !== undefined) updates.status = d.status;
      if (d.adminNotes !== undefined) updates.admin_notes = d.adminNotes;
      const { data, error } = await supabase.from("guest_requests").update(updates).eq("id", d.id).select("booking_id, status, bookings(guest_lang)").single<{ booking_id: string; status: string; bookings: { guest_lang: string } | { guest_lang: string }[] | null }>();
      if (error || !data) return NextResponse.json({ error: error ? "server_error" : "not_found" }, { status: error ? 500 : 404 });
      const ar = one(data.bookings)?.guest_lang === "ar";
      if (d.status && PUSH_MSG[d.status]) {
        const m = PUSH_MSG[d.status];
        sendPushToBooking(data.booking_id, { title: "JOOD", body: ar ? m.ar : m.en, tag: `request-${d.id}` }, supabase).catch((e) => console.error("[desk] push failed", e));
      } else if (d.adminNotes) {
        sendPushToBooking(data.booking_id, { title: ar ? "رسالة من فريق JOOD" : "Message from JOOD", body: ar ? "لديك رد جديد على طلبك" : "You have a new reply on your request", tag: `request-${d.id}` }, supabase).catch((e) => console.error("[desk] push failed", e));
      }
      return NextResponse.json({ ok: true });
    }

    if (d.action === "ticket_update") {
      const updates: Record<string, unknown> = { updated_at: now };
      if (d.status !== undefined) updates.status = d.status;
      if (d.priority !== undefined) updates.priority = d.priority;
      if (d.assignedTo !== undefined) updates.assigned_to = d.assignedTo;
      if (d.resolutionNotes !== undefined) updates.resolution_notes = d.resolutionNotes;
      if (d.status === "resolved") { updates.resolved_at = now; updates.resolved_by = d.resolvedBy || "JOOD admin panel"; }
      const { error } = await supabase.from("maintenance_tickets").update(updates).eq("id", d.id);
      if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (d.action === "ticket_create") {
      const { data, error } = await supabase.from("maintenance_tickets").insert({ property_id: d.propertyId, booking_id: d.bookingId ?? null, title: d.title, description: d.description ?? null, category: d.category, priority: d.priority, photo_urls: [] }).select("id").single<{ id: string }>();
      if (error || !data) return NextResponse.json({ error: "server_error" }, { status: 500 });
      return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
    }

    if (d.action === "stay_link") {
      const { data: booking } = await supabase.from("bookings").select("id, check_out, status").eq("id", d.bookingId).single<{ id: string; check_out: string; status: string }>();
      if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (booking.status === "cancelled") return NextResponse.json({ error: "cancelled" }, { status: 422 });
      await supabase.from("stay_tokens").update({ revoked_at: now }).eq("booking_id", d.bookingId).is("revoked_at", null);
      const plaintext = generateToken();
      const expiresAt = new Date(new Date(booking.check_out).getTime() + 48 * 3600 * 1000);
      const { error } = await supabase.from("stay_tokens").insert({ booking_id: d.bookingId, token_hash: hashToken(plaintext), issued_at: now, expires_at: expiresAt.toISOString() });
      if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
      return NextResponse.json({ ok: true, link: `${appUrl()}/s/${plaintext}`, expiresAt: expiresAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
    }
  } catch (err) {
    console.error("[bridge/desk] failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ error: "validation_error" }, { status: 400 });
}
