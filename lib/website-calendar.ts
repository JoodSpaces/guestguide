import * as Sentry from "@sentry/nextjs";
import { bridgeSignature } from "@/lib/bridge-auth";

/**
 * The website's availability (the catalogue calendar, Airbnb and the other channels) lives in the website's
 * database. A stay a person adds by hand here has to take its nights there, or the same nights can be sold twice;
 * and the calendar here shows what the other channels have taken. Both go through the website's signed `ops-calendar`
 * function: same shared secret as the stay bridge, the path pinned to "/ops-calendar".
 *
 * Off (a no-op) until WEBSITE_CALENDAR_URL is set, so local development and tests need nothing.
 */

export const CALENDAR_PATH = "/ops-calendar";
const TIMEOUT_MS = 8000;

export function calendarUrl(): string | null {
  const raw = process.env.WEBSITE_CALENDAR_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return u.protocol === "https:" || (local && u.protocol === "http:") ? u.toString() : null;
  } catch {
    return null;
  }
}

export type ReserveResult =
  | { kind: "ok" }
  | { kind: "skipped" }          // calendar link not configured
  | { kind: "not_on_website" }   // no website house uses this property: nothing to block
  | { kind: "conflict"; message: string }
  | { kind: "unavailable" };     // could not reach / trust the website: do not guess

async function call(payload: Record<string, unknown>): Promise<{ status: number; json: Record<string, unknown> } | null> {
  const url = calendarUrl();
  const secret = process.env.BRIDGE_SHARED_SECRET;
  if (!url || !secret) return null;
  const body = JSON.stringify(payload);
  const ts = String(Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-jood-timestamp": ts,
        "x-jood-signature": bridgeSignature(secret, ts, "POST", CALENDAR_PATH, body),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, json };
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: "website_calendar" } });
    return { status: 0, json: {} };
  }
}

export async function reserveNights(i: { bookingId: string; slug: string; checkIn: string; checkOut: string; ota: boolean }): Promise<ReserveResult> {
  if (!calendarUrl() || !process.env.BRIDGE_SHARED_SECRET) return { kind: "skipped" };
  const r = await call({ action: "reserve", ref: `app:${i.bookingId}`, slug: i.slug, checkIn: i.checkIn, checkOut: i.checkOut, ota: i.ota });
  if (!r) return { kind: "skipped" };
  if (r.status === 200) return { kind: "ok" };
  if (r.status === 404 && r.json.error === "house_not_found") return { kind: "not_on_website" };
  if (r.status === 409 && r.json.error === "date_conflict") {
    return { kind: "conflict", message: String(r.json.message ?? "Those nights are not available on the website.") };
  }
  return { kind: "unavailable" };
}

/** Best effort: if the website cannot be reached the nights stay blocked (the safe side) and this is reported. */
export async function releaseNights(bookingId: string): Promise<boolean> {
  if (!calendarUrl() || !process.env.BRIDGE_SHARED_SECRET) return true;
  const r = await call({ action: "release", ref: `app:${bookingId}` });
  const ok = !!r && r.status === 200;
  if (!ok) Sentry.captureMessage("website calendar: could not release nights", { level: "warning", tags: { subsystem: "website_calendar" }, extra: { bookingId, status: r?.status } });
  return ok;
}

export type ExternalBlockKind = "airbnb" | "booking" | "vrbo" | "channel" | "hold" | "maintenance";
export interface ExternalBlock { slug: string; kind: ExternalBlockKind; from: string; to: string }   // `to` = check-out day (exclusive)

export const BLOCK_LABEL: Record<ExternalBlockKind, string> = {
  airbnb: "Airbnb", booking: "Booking.com", vrbo: "VRBO", channel: "Another booking site", hold: "Held by JOOD", maintenance: "Maintenance",
};

/** Like externalBlocks, but `null` means "could not find out" (not configured, unreachable, refused) instead of "nothing taken". */
export async function externalBlocksOrNull(slugs: string[], from: string, to: string): Promise<ExternalBlock[] | null> {
  if (!calendarUrl() || !process.env.BRIDGE_SHARED_SECRET || !slugs.length) return null;
  const r = await call({ action: "blocks", from, to, slugs });
  if (!r || r.status !== 200 || !Array.isArray(r.json.ranges)) return null;
  return (r.json.ranges as ExternalBlock[]).filter((b) => b && typeof b.slug === "string" && typeof b.from === "string" && typeof b.to === "string");
}

/** What the other channels have taken, for the calendar. Any trouble means "show nothing extra", never an error page. */
export async function externalBlocks(slugs: string[], from: string, to: string): Promise<ExternalBlock[]> {
  return (await externalBlocksOrNull(slugs, from, to)) ?? [];
}

export type QuoteResult =
  | { kind: "ok"; available: true; nights: number; totalUsd: number; totalEgp: number | null }
  | { kind: "ok"; available: false; message: string }
  | { kind: "no_rate" }          // house found but no usable rate: do not invent a price
  | { kind: "not_on_website" }   // no website house uses this property
  | { kind: "unavailable" };     // not configured / unreachable / refused: say the team will check

/** Are these nights free on the website, and what would they cost (rooms only, no cleaning fee)? Read-only. */
export async function quoteNightsOnWebsite(slug: string, from: string, to: string): Promise<QuoteResult> {
  if (!calendarUrl() || !process.env.BRIDGE_SHARED_SECRET) return { kind: "unavailable" };
  const r = await call({ action: "quote", slug, from, to });
  if (!r) return { kind: "unavailable" };
  if (r.status === 404 && r.json.error === "house_not_found") return { kind: "not_on_website" };
  if (r.status !== 200 || r.json.ok !== true) return { kind: "unavailable" };
  if (r.json.available === false) return { kind: "ok", available: false, message: String(r.json.message ?? "Those nights are not available.") };
  const q = r.json.quote as { nights?: number; totalUsd?: number; totalEgp?: number | null } | null | undefined;
  if (!q || typeof q.totalUsd !== "number") return { kind: "no_rate" };
  return { kind: "ok", available: true, nights: Number(q.nights ?? 0), totalUsd: q.totalUsd, totalEgp: typeof q.totalEgp === "number" ? q.totalEgp : null };
}
