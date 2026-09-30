/**
 * Which look the guest sees: "classic" (today's app) or "next" (the new glass + orb design).
 * It is a per-browser choice kept in a cookie, switched with ?ui=next / ?ui=classic on any stay link.
 * The new look reuses every screen's data and security; only what is drawn changes.
 */
export const UI_COOKIE = "jood_ui";
export type UiMode = "classic" | "next";

export const parseUiMode = (v: string | null | undefined): UiMode => (v === "next" ? "next" : "classic");

/** The value of a ?ui= switch on a URL, or null when there is none (anything else is ignored). */
export function uiSwitch(params: URLSearchParams): UiMode | null {
  const v = params.get("ui");
  return v === "next" || v === "classic" ? v : null;
}

export const UI_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
