import { createServiceClient } from "@/lib/supabase/server";
import { cairoDay, cairoToUtcIso } from "@/lib/cairo-time";
import { hhmm } from "@/lib/time";
import { externalBlocksOrNull, quoteNightsOnWebsite, type QuoteResult } from "@/lib/website-calendar";
import { notifyAdminEmergency } from "@/lib/email";
import type { GuestBooking } from "@/lib/guest-auth";

/**
 * Things the voice agent can do beyond looking up: judge a late check-out against the real calendar, and raise an emergency.
 * Neither one promises anything: the agent still files a request and the team confirms.
 */

// ─── late check-out ──────────────────────────────────────────────────────────

/** Hours the team needs between a check-out and the next arrival to clean and reset the house. */
export const TURNOVER_BUFFER_H = 4;
/** The latest the agent will suggest on its own; anything later is a team decision. */
export const LATE_CHECKOUT_CAP = "18:00";

/** "15:00", "3pm", "3:30 pm" → minutes after midnight (NaN if not a time). */
export const toMin = (t: string): number => {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap]m?)?$/i.exec(t.trim().replace(/\./g, ""));
  if (!m) return NaN;
  let h = Number(m[1]); const min = Number(m[2] ?? 0);
  if (m[3]) { if (h < 1 || h > 12) return NaN; h = (h % 12) + (m[3].toLowerCase().startsWith("p") ? 12 : 0); }
  return h > 23 || min > 59 ? NaN : h * 60 + min;
};
export const fromMin = (n: number): string => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export type LateVerdict =
  | { kind: "already_ok" }
  | { kind: "clear"; offerUntil: string; capped: boolean }
  | { kind: "partial"; offerUntil: string; nextArrival: string }
  | { kind: "unavailable"; nextArrival: string }
  | { kind: "unknown" }
  | { kind: "invalid" };

/**
 * @param standard      the house's normal check-out time ("11:00")
 * @param requested     what the guest wants ("15:00")
 * @param nextArrival   arrival time of someone checking in the same day, or null when nobody is
 * @param calendarKnown false when the availability could not be checked (then never guess)
 */
export function lateCheckoutVerdict(i: { standard: string; requested: string; nextArrival: string | null; calendarKnown: boolean }): LateVerdict {
  const std = toMin(i.standard), req = toMin(i.requested);
  if (!Number.isFinite(std) || !Number.isFinite(req)) return { kind: "invalid" };
  if (req <= std) return { kind: "already_ok" };
  if (!i.calendarKnown) return { kind: "unknown" };
  const cap = toMin(LATE_CHECKOUT_CAP);
  if (i.nextArrival == null) {
    const until = Math.min(req, cap);
    return { kind: "clear", offerUntil: fromMin(until), capped: until < req };
  }
  const arr = toMin(i.nextArrival);
  if (!Number.isFinite(arr)) return { kind: "unknown" };
  const latest = Math.floor((arr - TURNOVER_BUFFER_H * 60) / 30) * 30;
  if (latest <= std) return { kind: "unavailable", nextArrival: i.nextArrival };
  const until = Math.min(req, latest, cap);
  return until >= req ? { kind: "clear", offerUntil: fromMin(until), capped: false } : { kind: "partial", offerUntil: fromMin(until), nextArrival: i.nextArrival };
}

const cairoHm = (iso: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

/** The earliest same-day arrival at this property (the app's own bookings, then the website's other channels), or why we can't tell. */
export async function nextSameDayArrival(booking: GuestBooking, checkinTime: string): Promise<{ arrival: string | null; known: boolean }> {
  const supabase = createServiceClient();
  const day = cairoDay(new Date(booking.check_out).getTime());
  const [{ data: bookings, error }, { data: prop }] = await Promise.all([
    supabase.from("bookings").select("check_in").eq("property_id", booking.property_id).neq("id", booking.id).neq("status", "cancelled")
      .gte("check_in", day.startIso).lte("check_in", day.endIso).order("check_in").limit(5).returns<{ check_in: string }[]>(),
    supabase.from("properties").select("slug").eq("id", booking.property_id).single<{ slug: string | null }>(),
  ]);
  if (error) return { arrival: null, known: false };
  const times: string[] = (bookings ?? []).map((b) => cairoHm(b.check_in));

  // The website calendar covers Airbnb, Booking.com, VRBO and staff holds. If it is not connected for this house we only know the app.
  const slug = prop?.slug ?? null;
  let known = true;
  if (slug && process.env.WEBSITE_CALENDAR_URL) {
    const end = new Date(new Date(day.startIso).getTime() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const blocks = await externalBlocksOrNull([slug], day.date, end);
    if (blocks === null) known = false;
    else if (blocks.some((b) => b.slug === slug && b.from === day.date)) times.push(hhmm(checkinTime, "15:00"));
  }
  times.sort();
  return { arrival: times[0] ?? null, known };
}

export function describeLateVerdict(v: LateVerdict, standard: string, requested: string, feeLine: string): string {
  const filing = `If the guest wants it, call request_service with service "Late check-out" and details "until HH:MM" (the time you offered). Never say it is approved: the team confirms. ${feeLine}`;
  switch (v.kind) {
    case "already_ok": return `${requested} is not later than the normal check-out (${standard}). Nothing to request.`;
    case "invalid": return "The time was not understood. Ask the guest for a clear time like 2pm.";
    case "unknown": return `The calendar could not be checked right now. Do not guess. Say the team will check availability, and file it: ${filing}`;
    case "unavailable": return `Not possible: someone else checks in the same day (from ${v.nextArrival}) and the house needs ${TURNOVER_BUFFER_H} hours to be made ready. Offer luggage storage after ${standard} instead (call request_service, service "Luggage storage").`;
    case "partial": return `Not until ${requested}, because another guest arrives the same day (from ${v.nextArrival}). The latest that could work is ${v.offerUntil}. Offer ${v.offerUntil}. ${filing}`;
    case "clear": return `Nobody else arrives that day, so ${v.offerUntil} looks possible${v.capped ? ` (${LATE_CHECKOUT_CAP} is the latest you may suggest; later is the team's call)` : ""}. Say "it looks possible, the team will confirm". ${filing}`;
  }
}

export async function checkLateCheckout(booking: GuestBooking, requested: string): Promise<string> {
  const supabase = createServiceClient();
  const { data: prop } = await supabase.from("properties").select("checkin_time, checkout_time").eq("id", booking.property_id)
    .single<{ checkin_time: string | null; checkout_time: string | null }>();
  const standard = hhmm(prop?.checkout_time, "11:00");
  const { arrival, known } = await nextSameDayArrival(booking, prop?.checkin_time ?? "15:00");
  const verdict = lateCheckoutVerdict({ standard, requested, nextArrival: arrival, calendarKnown: known });

  const { data: svc } = await supabase.from("services").select("name_en, price_egp").eq("is_active", true).ilike("name_en", "%late%check%")
    .or(`property_id.is.null,property_id.eq.${booking.property_id}`).limit(1).returns<{ name_en: string; price_egp: number }[]>();
  const price = svc?.[0]?.price_egp;
  const feeLine = price && price > 0 ? `The listed price is ${price} EGP; the team confirms before charging.` : "Do not quote a price: the team confirms any fee.";
  return describeLateVerdict(verdict, standard, requested, feeLine);
}

// ─── emergencies ─────────────────────────────────────────────────────────────

export const EMERGENCY_KINDS = ["gas", "fire", "flood", "electrical", "medical", "lockout", "security", "other"] as const;
export type EmergencyKind = (typeof EMERGENCY_KINDS)[number];
export const isEmergencyKind = (s: unknown): s is EmergencyKind => typeof s === "string" && (EMERGENCY_KINDS as readonly string[]).includes(s);

/** Egypt: police 122, ambulance 123, fire 180, tourist police 126. */
const SAFETY: Record<EmergencyKind, string> = {
  gas: "Tell the guest now: do not use switches, flames or phones near the smell; open windows, leave the house with everyone, and call the fire service on 180 from outside.",
  fire: "Tell the guest now: get everyone out, do not collect belongings, and call the fire service on 180 from outside.",
  flood: "Tell the guest now: if it is safe, turn off the water at the main valve and keep away from sockets and wet electrics; the team is being alerted.",
  electrical: "Tell the guest now: do not touch the faulty item or anything wet near it; switch off at the fuse board only if it is dry and safe; leave the room if there is a burning smell.",
  medical: "Tell the guest now: call the ambulance on 123 immediately. The team is also being alerted and will help with directions.",
  lockout: "Tell the guest: stay calm, the on-call team is being alerted to help them back in; do not force the door.",
  security: "Tell the guest now: if anyone is in danger call the police on 122 (tourist police 126); the team is being alerted.",
  other: "Tell the guest the team is being alerted and to call the on-call phone now.",
};

export const emergencyGuidance = (k: EmergencyKind): string => SAFETY[k];

export async function raiseEmergency(booking: GuestBooking, kind: EmergencyKind, details: string): Promise<{ text: string; onCallPhone: string | null; ok: boolean }> {
  const supabase = createServiceClient();
  const clean = details.replace(/\s+/g, " ").trim().slice(0, 600);
  const { data: prop } = await supabase.from("properties").select("name, on_call_phone").eq("id", booking.property_id)
    .single<{ name: string; on_call_phone: string | null }>();
  const { data: row, error } = await supabase.from("guest_requests").insert({
    booking_id: booking.id,
    category: kind === "medical" || kind === "security" || kind === "lockout" ? "other" : "maintenance",
    body: `[EMERGENCY: ${kind}] [Voice concierge] ${clean || "(no details given)"}`,
    urgency: "urgent",
    status: "received",
  }).select("id").single<{ id: string }>();
  const phone = prop?.on_call_phone?.trim() || null;
  if (error || !row) {
    return { ok: false, onCallPhone: phone, text: `The alert could not be saved. ${SAFETY[kind]} ${phone ? `Give them the on-call number ${phone} and tell them to call it now.` : "Tell them to use Contact the team."}` };
  }
  notifyAdminEmergency({
    guestName: `${booking.guest_first_name} ${booking.guest_last_name}`, propertyName: prop?.name ?? "the property",
    kind, details: clean, onCallPhone: phone, requestId: row.id,
  });
  return {
    ok: true, onCallPhone: phone,
    text: `Emergency logged and the office has been emailed. ${SAFETY[kind]} ${phone ? "A Call button for the on-call phone is now on the guest's screen: tell them to tap it." : "No on-call phone is set: tell them the team has been alerted."} Keep the guest calm and keep your sentences short.`,
  };
}

// ─── extend stay ─────────────────────────────────────────────────────────────

export const MAX_EXTENSION_NIGHTS = 14;
const addDaysIso = (date: string, n: number): string => new Date(Date.parse(date + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

export type ExtendVerdict =
  | { kind: "invalid" }
  | { kind: "too_long" }
  | { kind: "conflict"; message: string }
  | { kind: "available"; from: string; to: string; nights: number; usd: number | null; egp: number | null }
  | { kind: "unknown" };

/** Pure: turn the website's answer and our own bookings into one verdict. The app's own bookings always win a disagreement. */
export function extendVerdict(i: { nights: number; from: string; appClash: string | null; website: QuoteResult }): ExtendVerdict {
  if (!Number.isInteger(i.nights) || i.nights < 1) return { kind: "invalid" };
  if (i.nights > MAX_EXTENSION_NIGHTS) return { kind: "too_long" };
  const to = addDaysIso(i.from, i.nights);
  if (i.appClash) return { kind: "conflict", message: `${i.appClash} has another stay on those nights.` };
  const w = i.website;
  if (w.kind === "ok" && !w.available) return { kind: "conflict", message: w.message };
  if (w.kind === "ok" && w.available) return { kind: "available", from: i.from, to, nights: i.nights, usd: w.totalUsd, egp: w.totalEgp };
  // Not on the website at all (or no rate): the app's calendar is clear but nobody has priced it. Never invent a number.
  if (w.kind === "not_on_website" || w.kind === "no_rate") return { kind: "available", from: i.from, to, nights: i.nights, usd: null, egp: null };
  return { kind: "unknown" };
}

export function describeExtend(v: ExtendVerdict, isAr = false): string {
  const filing = (when: string, price: string) => `If the guest wants it, call request_service with service "Extend stay" and details "${when}${price}". Never say it is booked or confirmed: the team confirms and arranges payment. Do not send a payment link.`;
  switch (v.kind) {
    case "invalid": return "Ask the guest how many extra nights they want (a whole number).";
    case "too_long": return `Longer than ${MAX_EXTENSION_NIGHTS} extra nights is arranged by the team. Offer to send a request with message_team.`;
    case "conflict": return `Not possible: ${v.message} Say that the house is taken after their check-out, and offer to message the team in case something can be arranged.`;
    case "unknown": return `Availability could not be checked right now. Do not guess. Say the team will check, then: ${filing("extra nights after check-out", "")}`;
    case "available": {
      const price = v.usd != null ? `Estimated price for the room: about ${v.egp != null ? `${Math.round(v.egp)} EGP (${v.usd} USD)` : `${v.usd} USD`}, no cleaning fee; the team confirms the final price.` : "No price is available: do not quote one, the team confirms it.";
      const when = `${v.nights} extra night${v.nights === 1 ? "" : "s"}, ${v.from} to ${v.to}`;
      return `Those ${v.nights} night${v.nights === 1 ? " is" : "s are"} free (${v.from} to ${v.to}). ${price} ${filing(when, v.usd != null ? `, estimated ${v.usd} USD` : "")}`;
    }
  }
}

export async function checkExtension(booking: GuestBooking, nights: number): Promise<string> {
  const supabase = createServiceClient();
  const from = cairoDay(new Date(booking.check_out).getTime()).date;
  const to = addDaysIso(from, Math.min(Math.max(Math.trunc(nights) || 0, 0), MAX_EXTENSION_NIGHTS + 1));
  if (!(nights >= 1) || nights > MAX_EXTENSION_NIGHTS) return describeExtend(extendVerdict({ nights: Math.trunc(nights), from, appClash: null, website: { kind: "unavailable" } }));

  const [{ data: prop }, { data: clash }] = await Promise.all([
    supabase.from("properties").select("name, slug").eq("id", booking.property_id).single<{ name: string; slug: string | null }>(),
    supabase.from("bookings").select("check_in").eq("property_id", booking.property_id).neq("id", booking.id).neq("status", "cancelled")
      .lt("check_in", cairoToUtc(to)).gt("check_out", cairoToUtc(from)).limit(1).returns<{ check_in: string }[]>(),
  ]);
  const website: QuoteResult = prop?.slug ? await quoteNightsOnWebsite(prop.slug, from, addDaysIso(from, nights)) : { kind: "not_on_website" };
  return describeExtend(extendVerdict({ nights, from, appClash: clash?.length ? (prop?.name ?? "The house") : null, website }));
}
const cairoToUtc = (date: string): string => cairoToUtcIso(date, "12:00");
