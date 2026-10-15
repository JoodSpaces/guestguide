/** A calendar file for a stay: check-in and check-out as two events. Dates are the stay's own instants, in UTC. */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");

export function stayCalendar(opts: { house: string; checkIn: string; checkOut: string; url: string; uid: string }): string {
  const inD = new Date(opts.checkIn), outD = new Date(opts.checkOut);
  const hour = 60 * 60 * 1000;
  const ev = (suffix: string, title: string, start: Date, desc: string) => [
    "BEGIN:VEVENT",
    `UID:${opts.uid}-${suffix}@jood`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + hour))}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(desc)}`,
    `URL:${opts.url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "TRIGGER:-PT2H", "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//JOOD//Stay//EN", "CALSCALE:GREGORIAN",
    ev("in", `Check-in · ${opts.house}`, inD, `Your JOOD stay at ${opts.house}. Your stay page: ${opts.url}`),
    ev("out", `Check-out · ${opts.house}`, outD, `Your JOOD stay at ${opts.house}. Your stay page: ${opts.url}`),
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(name: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
