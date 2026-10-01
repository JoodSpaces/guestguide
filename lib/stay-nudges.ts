import { cairoDay } from "@/lib/cairo-time";
import { hhmm } from "@/lib/time";

/**
 * Proactive nudges, decided once a day. Two kinds, both pointing the guest at the voice concierge:
 *  - checkout_eve: the evening before check-out ("want a late check-out?")
 *  - midstay: the day after check-in on stays of 3+ nights ("how is everything?")
 * Each is sent once per stay, never to a guest on Do Not Disturb, and the evening one is skipped if the guest already asked
 * about a late check-out. Pure decisions here; the cron route does the sending.
 */
export type NudgeKind = "checkout_eve" | "midstay";

export interface NudgeCandidate {
  id: string; guestLang: string | null; checkIn: string; checkOut: string; status: string; dnd: boolean;
  checkoutTime: string | null; askedLateCheckout: boolean; alreadySent: NudgeKind[];
}

const DAY = 24 * 3600 * 1000;

export function pickNudge(c: NudgeCandidate, now = Date.now()): NudgeKind | null {
  if (c.status === "cancelled" || c.dnd) return null;
  const today = cairoDay(now).date;
  const outDay = cairoDay(new Date(c.checkOut).getTime()).date;
  const inDay = cairoDay(new Date(c.checkIn).getTime()).date;
  const nights = Math.round((Date.parse(outDay + "T00:00:00Z") - Date.parse(inDay + "T00:00:00Z")) / DAY);
  const tomorrow = cairoDay(now + DAY).date;
  const yesterday = cairoDay(now - DAY).date;

  if (outDay === tomorrow && !c.alreadySent.includes("checkout_eve") && !c.askedLateCheckout) return "checkout_eve";
  if (inDay === yesterday && nights >= 3 && today < outDay && !c.alreadySent.includes("midstay")) return "midstay";
  return null;
}

export function nudgeText(kind: NudgeKind, lang: string | null, checkoutTime: string | null): { title: string; body: string } {
  const ar = lang === "ar";
  const t = hhmm(checkoutTime, "11:00");
  if (kind === "checkout_eve") {
    return ar
      ? { title: "JOOD", body: `المغادرة غداً الساعة ${t}. تريد مغادرة متأخرة أو مساعدة في أي شيء؟ اسأل المساعد الصوتي.` }
      : { title: "JOOD", body: `Check-out is tomorrow at ${t}. Want a late check-out, or help with anything? Ask the concierge.` };
  }
  return ar
    ? { title: "JOOD", body: "كيف تسير إقامتك؟ إن احتجت أي شيء، تحدّث مع المساعد الصوتي." }
    : { title: "JOOD", body: "How is your stay going? If you need anything, just talk to the concierge." };
}
