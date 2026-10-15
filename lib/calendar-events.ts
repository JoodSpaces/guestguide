import type { Tone } from "@/components/app/ui";

/** One thing that happens on one day (Cairo date). Everything the calendar shows reduces to these. */
export type CalKind = "checkin" | "checkout" | "clean" | "fix" | "service" | "request";
export interface CalEvent {
  id: string;
  date: string;               // YYYY-MM-DD, Cairo
  kind: CalKind;
  title: string;
  sub: string;
  propertyId: string | null;
  href: string;
  state: string;
  tone: Tone;
  urgent?: boolean;
}
/** A stay as a range: `from` is the check-in day, `to` the check-out day. */
export interface CalStay { id: string; from: string; to: string; guest: string; propertyId: string | null; propertyName: string; href: string }

export const KIND_LABEL: Record<CalKind, string> = {
  checkin: "Check-in", checkout: "Check-out", clean: "Cleaning", fix: "Maintenance", service: "Service", request: "Request",
};

/** The Cairo calendar date of an instant (the server runs in UTC, which is a day behind for the first hours after midnight). */
export function cairoDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** "2026-10" → the first day, the day after the last, and the number of days. */
export function monthBounds(m: string): { first: string; next: string; days: number } {
  const [y, mo] = m.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ny = mo === 12 ? y + 1 : y, nm = mo === 12 ? 1 : mo + 1;
  return { first: `${y}-${pad(mo)}-01`, next: `${ny}-${pad(nm)}-01`, days: new Date(Date.UTC(y, mo, 0)).getUTCDate() };
}

export function shiftMonth(m: string, by: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** What a day holds, for the dot and the day sheet. In-house guests are those staying through (not arriving or leaving). */
export function dayContents(date: string, events: CalEvent[], stays: CalStay[]) {
  const ev = events.filter((e) => e.date === date);
  const inHouse = stays.filter((s) => s.from < date && s.to > date);
  return { events: ev, inHouse, urgent: ev.some((e) => e.urgent), busy: ev.length, quiet: ev.length === 0 && inHouse.length === 0 };
}
