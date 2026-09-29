import webPush from "web-push";
import * as Sentry from "@sentry/nextjs";

// Configured on first use, not at import: a build (or a preview deployment) without the
// VAPID keys must not fail — it just cannot send push notifications.
let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webPush.setVapidDetails("mailto:team@jood.com", pub, priv);
  vapidReady = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

type Sub = { endpoint: string; p256dh: string; auth: string };

export async function sendPush(sub: Sub, payload: PushPayload): Promise<"ok" | "expired" | "error"> {
  if (!ensureVapid()) {
    console.error("[push] VAPID keys are not configured — notification not sent");
    return "error";
  }
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 3600 },
    );
    return "ok";
  } catch (err: unknown) {
    const e = err as { statusCode?: number; body?: string; message?: string };
    if (e.statusCode !== 410) {
      Sentry.captureException(err, {
        extra: { statusCode: e.statusCode, body: e.body, endpoint: sub.endpoint.slice(0, 60) },
        tags: { subsystem: "push" },
      });
    }
    console.error("[push] sendNotification failed", {
      statusCode: e.statusCode,
      body: e.body,
      message: e.message,
      endpoint: sub.endpoint.slice(0, 60),
    });
    if (e.statusCode === 410) return "expired";
    return "error";
  }
}

export async function sendPushToBooking(
  bookingId: string,
  payload: PushPayload,
  supabase: { from: (t: string) => unknown },
) {
  const db = supabase as import("@supabase/supabase-js").SupabaseClient;
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("booking_id", bookingId);

  if (!subs?.length) return;

  const expired: string[] = [];
  await Promise.all(
    subs.map(async (s: Sub & { id: string }) => {
      const result = await sendPush(s, payload);
      if (result === "expired") expired.push(s.id);
    }),
  );

  if (expired.length) {
    await db.from("push_subscriptions").delete().in("id", expired);
  }
}
