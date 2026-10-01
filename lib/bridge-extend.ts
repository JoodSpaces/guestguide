import { cairoDay } from "@/lib/cairo-time";

/**
 * A paid extension on the website moves the check-out of the stay that already exists here (it does not create a second one);
 * a refund of that extension moves it back. The decision, kept pure so it can be tested without a database.
 *
 *   extend: today's check-out must be the day the extension starts (`from`); then it becomes `to`.
 *   revert: only if the check-out is still the end of THIS extension (`to`); then it goes back to `from`.
 * Both are idempotent: the website retries freely, so "already done" is a success.
 */
export type ExtendPlan =
  | { kind: "noop" }
  | { kind: "set"; toDate: string }
  | { kind: "refuse"; error: "cancelled" | "already_completed" | "unexpected_dates" | "superseded" };

export function planExtend(i: { action: "extend" | "revert"; status: string; currentCheckOut: string; from: string; to: string }): ExtendPlan {
  if (i.status === "cancelled") return { kind: "refuse", error: "cancelled" };
  if (i.status === "completed") return { kind: "refuse", error: "already_completed" };
  const cur = cairoDay(new Date(i.currentCheckOut).getTime()).date;
  if (i.action === "extend") {
    if (cur >= i.to) return { kind: "noop" };
    if (cur !== i.from) return { kind: "refuse", error: "unexpected_dates" };
    return { kind: "set", toDate: i.to };
  }
  if (cur <= i.from) return { kind: "noop" };
  if (cur !== i.to) return { kind: "refuse", error: "superseded" };
  return { kind: "set", toDate: i.from };
}
