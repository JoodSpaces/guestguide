import { createServiceClient } from "@/lib/supabase/server";
import { computePhase } from "@/lib/token";
import { hhmm } from "@/lib/time";
import type { GuestBooking } from "@/lib/guest-auth";

/**
 * Read-only lookups the voice agent can call mid-conversation. Each one is scoped to the guest's own booking and property on the
 * server; the agent never sees the stay token. Results are short plain text (the agent speaks them), never raw rows.
 * Nothing here returns the door code, the Wi-Fi password, or any other guest's data.
 */
export const VOICE_READ_TOOLS = ["get_services", "get_request_status", "get_nearby", "get_my_stay", "search_house_guide"] as const;
export type VoiceReadTool = (typeof VOICE_READ_TOOLS)[number];
export const isVoiceReadTool = (s: unknown): s is VoiceReadTool => typeof s === "string" && (VOICE_READ_TOOLS as readonly string[]).includes(s);

type Lang = "en" | "ar";
const pick = <T extends string | null | undefined>(isAr: boolean, ar: T, en: T): string => ((isAr ? ar : en) || en || ar || "") as string;

// ─── pure helpers (unit-tested) ──────────────────────────────────────────────

const STOP = new Set(["the", "a", "an", "is", "are", "to", "of", "in", "on", "and", "or", "do", "does", "how", "what", "where", "can", "i", "my", "we", "you", "it", "there", "any", "for", "with"]);
const normalise = (s: string) => s.toLowerCase().replace(/[ً-ٟـ]/g, "").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
export const tokens = (s: string): string[] => normalise(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1 && !STOP.has(w));

/** Rank entries by how many query words appear (title hits count triple) and keep the best few. */
export function rankEntries<T extends { title: string; body: string }>(entries: T[], query: string, max = 3): T[] {
  const q = tokens(query);
  if (!q.length) return [];
  return entries
    .map((e) => {
      const t = normalise(e.title), b = normalise(e.body);
      return { e, score: q.reduce((n, w) => n + (t.includes(w) ? 3 : 0) + (b.includes(w) ? 1 : 0), 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.e);
}

export function nightsLeft(checkIn: string, checkOut: string, now = Date.now()): { total: number; left: number } {
  const day = 24 * 3600 * 1000;
  const total = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / day));
  const left = Math.max(0, Math.ceil((new Date(checkOut).getTime() - Math.max(now, new Date(checkIn).getTime())) / day));
  return { total, left };
}

const STATUS_EN: Record<string, string> = {
  received: "received, not picked up yet", in_progress: "being handled by the team", resolved: "resolved",
  pending: "waiting for the team to confirm", confirmed: "confirmed", awaiting_payment: "confirmed, waiting for payment",
  paid: "paid", fulfilled: "done", rejected: "declined", cancelled: "cancelled",
};
const STATUS_AR: Record<string, string> = {
  received: "وصل ولم يُستلم بعد", in_progress: "الفريق يعمل عليه", resolved: "تم حله",
  pending: "بانتظار تأكيد الفريق", confirmed: "تم تأكيده", awaiting_payment: "تم تأكيده وبانتظار الدفع",
  paid: "مدفوع", fulfilled: "تم تنفيذه", rejected: "تم رفضه", cancelled: "أُلغي",
};
export const statusText = (s: string, isAr: boolean): string => (isAr ? STATUS_AR : STATUS_EN)[s] ?? s.replace(/_/g, " ");

const ago = (iso: string, now = Date.now()): string => {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
};

// ─── tools ───────────────────────────────────────────────────────────────────

export async function runVoiceReadTool(booking: GuestBooking, tool: VoiceReadTool, args: Record<string, unknown>, lang: Lang): Promise<string> {
  const isAr = lang === "ar";
  const supabase = createServiceClient();
  const text = (k: string, max = 120) => String(args[k] ?? "").slice(0, max).trim();

  switch (tool) {
    case "get_services": {
      const { data } = await supabase.from("services").select("*").eq("is_active", true)
        .or(`property_id.is.null,property_id.eq.${booking.property_id}`).order("sort_order").limit(40);
      const q = text("query");
      let rows = (data ?? []) as Record<string, unknown>[];
      if (q) {
        const hit = rankEntries(rows.map((r) => ({ r, title: `${r.name_en} ${r.name_ar}`, body: `${r.description_en ?? ""} ${r.description_ar ?? ""}` })), q, 6).map((x) => x.r);
        if (hit.length) rows = hit;
      }
      if (!rows.length) return "No extra services are set up for this house. Offer to message the team.";
      const lines = rows.slice(0, 10).map((r) => {
        const lead = Number(r.lead_hours ?? r.lead_time_hours ?? 0);
        const price = Number(r.price_egp ?? 0);
        return `- ${pick(isAr, r.name_ar as string, r.name_en as string)}: ${price > 0 ? `${price} EGP` : "price confirmed by the team"}${lead ? `, needs ${lead} hours notice` : ""}. ${pick(isAr, r.description_ar as string, r.description_en as string)}`.slice(0, 260);
      });
      return `Services on the menu (prices are indicative; the team confirms before anything is charged):\n${lines.join("\n")}\nTo order one, call request_service.`;
    }

    case "get_request_status": {
      const [{ data: msgs }, { data: orders }] = await Promise.all([
        supabase.from("guest_requests").select("category, body, urgency, status, admin_notes, created_at").eq("booking_id", booking.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("service_requests").select("status, quantity, created_at, services(name_en, name_ar)").eq("booking_id", booking.id).order("created_at", { ascending: false }).limit(5),
      ]);
      const out: string[] = [];
      for (const m of msgs ?? []) {
        const note = m.admin_notes ? ` Team note: ${String(m.admin_notes).slice(0, 160)}` : "";
        out.push(`- ${m.category} request "${String(m.body).replace(/^\[Voice concierge\]\s*/, "").slice(0, 100)}" (${ago(m.created_at)}): ${statusText(m.status, isAr)}.${note}`);
      }
      for (const o of (orders ?? []) as unknown as { status: string; quantity: number; created_at: string; services: { name_en: string; name_ar: string } | { name_en: string; name_ar: string }[] | null }[]) {
        const s = Array.isArray(o.services) ? o.services[0] : o.services;
        out.push(`- Service order ${s ? pick(isAr, s.name_ar, s.name_en) : ""} x${o.quantity} (${ago(o.created_at)}): ${statusText(o.status, isAr)}.`);
      }
      return out.length ? `This guest's recent requests, newest first:\n${out.join("\n")}` : "This guest has not sent any requests yet.";
    }

    case "get_nearby": {
      const { data: prop } = await supabase.from("properties").select("id, city").eq("id", booking.property_id).single<{ id: string; city: string | null }>();
      const { data } = await supabase.from("recommendations")
        .select("category, name, blurb_en, blurb_ar, price_band, jood_can_arrange, scope")
        .or(`scope.eq.global,and(scope.eq.city,city.eq.${(prop?.city ?? "").replace(/[,()]/g, "")}),and(scope.eq.property,property_id.eq.${booking.property_id})`)
        .order("scope", { ascending: false }).order("sort_order").limit(60);
      const cat = normalise(text("category"));
      let rows = (data ?? []) as { category: string; name: string; blurb_en: string; blurb_ar: string; price_band: number | null; jood_can_arrange: boolean }[];
      if (cat) {
        const hit = rows.filter((r) => normalise(r.category).includes(cat) || normalise(r.name).includes(cat) || normalise(r.blurb_en).includes(cat));
        if (hit.length) rows = hit;
      }
      if (!rows.length) return "No local recommendations are saved for this area. Say so, and offer to message the team.";
      return `Recommendations curated by JOOD (only mention these; do not invent others):\n${rows.slice(0, 6).map((r) =>
        `- ${r.name} (${r.category}${r.price_band ? `, ${"$".repeat(r.price_band)}` : ""}): ${pick(isAr, r.blurb_ar, r.blurb_en).slice(0, 200)}${r.jood_can_arrange ? " JOOD can arrange this." : ""}`).join("\n")}`;
    }

    case "get_my_stay": {
      const { data: prop } = await supabase.from("properties").select("checkin_time, checkout_time").eq("id", booking.property_id).single<{ checkin_time: string | null; checkout_time: string | null }>();
      const { total, left } = nightsLeft(booking.check_in, booking.check_out);
      const phase = computePhase(booking.check_in, booking.check_out);
      const d = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long" });
      return [
        `Stay stage: ${phase}. ${total} nights in total, ${left} night${left === 1 ? "" : "s"} remaining.`,
        `Check-in ${d(booking.check_in)} from ${hhmm(prop?.checkin_time, "15:00")}. Check-out ${d(booking.check_out)} by ${hhmm(prop?.checkout_time, "11:00")}.`,
        "Late check-out and extensions are never promised by you: call request_service (late check-out) so the team checks the next booking and confirms.",
      ].join("\n");
    }

    case "search_house_guide": {
      const q = text("query", 200);
      if (!q) return "No question was given.";
      const { data } = await supabase.from("property_content").select("title_en, title_ar, body_en, body_ar")
        .eq("property_id", booking.property_id).eq("is_published", true).limit(200);
      const entries = (data ?? []).map((e) => ({ title: pick(isAr, e.title_ar, e.title_en), body: pick(isAr, e.body_ar, e.body_en) }));
      const hit = rankEntries(entries, q, 3);
      if (!hit.length) return "Nothing in the house guide matches. Call flag_unanswered and offer to message the team.";
      return `House guide matches (state only what is written here):\n${hit.map((e) => `### ${e.title}\n${e.body.slice(0, 900)}`).join("\n\n")}`;
    }
  }
}
