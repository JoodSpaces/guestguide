/**
 * "10 Nov, 15:00 in Cairo" → the UTC instant, honouring Egypt's daylight saving.
 * Website bookings carry dates only; a property has a local check-in / check-out
 * time. Vercel runs in UTC, so building the timestamp with `new Date("2026-11-10T15:00")`
 * would be 1–2 hours wrong.
 */
const TZ = "Africa/Cairo";

function offsetMinutes(utcMs: number): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" })
    .formatToParts(new Date(utcMs))
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT+2";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part);
  if (!m) return 120;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

export function cairoToUtcIso(date: string, time: string): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!d || !t) throw new Error("invalid date or time");
  const asIfUtc = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  // Two passes: the offset at the guessed instant, then at the corrected one (DST edges).
  let utc = asIfUtc - offsetMinutes(asIfUtc) * 60_000;
  utc = asIfUtc - offsetMinutes(utc) * 60_000;
  return new Date(utc).toISOString();
}
