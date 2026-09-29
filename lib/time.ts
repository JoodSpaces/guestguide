/** Postgres `time` values arrive as "11:00:00"; guests should see "11:00". */
export function hhmm(t: string | null | undefined, fallback = ""): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "");
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : fallback;
}
