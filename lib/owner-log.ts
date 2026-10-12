/**
 * The owner's activity log (kept in the website project, section AR there). The Guest App reports what happens on stay links, in the admin and on its APIs to the website's
 * `log-event` function, with a shared secret. Best effort and silent by design: no secret set means nothing is sent, and a failure here must never touch the request.
 *
 * Never sent: the stay link's secret key (a short fingerprint of it stands in, so one stay can still be followed), passwords, tokens, door codes, request bodies, query strings.
 */
const URL_ = process.env.OWNER_LOG_URL || "https://pbhudkzimquvwfsecslw.supabase.co/functions/v1/log-event";

export interface OwnerLogEvent {
  source: "stay_link" | "guest_app";
  event: string;
  path?: string;
  subject?: string;
  actor?: { name?: string; email?: string; role?: string; id?: string };
  details?: Record<string, unknown>;
  session?: string;
}

/** A short, stable fingerprint of a stay link's key: enough to follow one stay in the log, useless for opening it. */
export async function stayFingerprint(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("stay-log:" + token));
  return Array.from(new Uint8Array(buf)).slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function maskStayPath(pathname: string, fingerprint: string): string {
  return pathname.replace(/^\/s\/[A-Za-z0-9_-]{22}/, `/s/[stay:${fingerprint}]`);
}

export async function sendOwnerLog(events: OwnerLogEvent[]): Promise<void> {
  const secret = process.env.OWNER_LOG_SECRET;
  if (!secret || !events.length) return;
  try {
    await fetch(URL_, {
      method: "POST",
      headers: { "content-type": "application/json", "x-log-secret": secret },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* logging is never allowed to matter */
  }
}
