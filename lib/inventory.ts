/** Shared inventory rules. The database applies the same ones (migration 030): stock BELOW par is low, 0 is out,
 *  par 0 means "not tracked for alerts". */

export type StockStatus = "critical" | "low" | "ok" | "unset";

export function stockStatus(current: number, par: number): StockStatus {
  if (par <= 0) return "unset";
  if (current <= 0) return "critical";
  return current < par ? "low" : "ok";
}

/** Alerts most urgent first. (Sorting the text "critical" / "medium" / "low" alphabetically puts critical LAST.) */
const RANK: Record<string, number> = { critical: 0, medium: 1, low: 2 };
export const severityRank = (s: string | null | undefined): number => RANK[s ?? ""] ?? 3;

export function sortAlerts<T extends { severity: string | null; created_at?: string | null }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
  );
}

/** Postgres unique-violation. */
export const isUniqueViolation = (e: { code?: string } | null | undefined): boolean => e?.code === "23505";
