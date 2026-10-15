/**
 * The last thing the concierge told the guest, kept on the phone so the top of the home can show it
 * (and carry on from it). Written by the text chat and the voice concierge, read by the home.
 */
export type LiveAnswer = { q?: string; a: string; via: "chat" | "voice"; at: number };

const KEY = (token: string) => `jood-live-${token}`;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function publishAnswer(token: string, ans: Omit<LiveAnswer, "at">) {
  if (typeof window === "undefined" || !ans.a.trim()) return;
  const full: LiveAnswer = { ...ans, a: ans.a.trim().slice(0, 1200), at: Date.now() };
  try { localStorage.setItem(KEY(token), JSON.stringify(full)); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent("jood-live-answer", { detail: full }));
}

export function readAnswer(token: string): LiveAnswer | null {
  try {
    const raw = localStorage.getItem(KEY(token));
    if (!raw) return null;
    const v = JSON.parse(raw) as LiveAnswer;
    return v && typeof v.a === "string" && Date.now() - v.at < MAX_AGE_MS ? v : null;
  } catch {
    return null;
  }
}
