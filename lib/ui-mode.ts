/**
 * Which look the guest sees on a stay link: "next" (the glass + orb design, the default) or "classic" (the earlier look).
 * It is a per-browser choice kept in a cookie, switched with ?ui=classic / ?ui=next on any stay link.
 * The new look reuses every screen's data and security; only what is drawn changes. Pages outside /s/ (admin, payment
 * result) are always classic: the middleware marks stay requests with STAY_HEADER and the root layout checks it.
 */
export const UI_COOKIE = "jood_ui";
export const STAY_HEADER = "x-jood-stay";
export type UiMode = "classic" | "next";

export const parseUiMode = (v: string | null | undefined): UiMode => (v === "classic" ? "classic" : "next");

/** The value of a ?ui= switch on a URL, or null when there is none (anything else is ignored). */
export function uiSwitch(params: URLSearchParams): UiMode | null {
  const v = params.get("ui");
  return v === "next" || v === "classic" ? v : null;
}

export const UI_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
