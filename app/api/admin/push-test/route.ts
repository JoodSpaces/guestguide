import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";
import { sendPush } from "@/lib/push";

export async function GET(req: NextRequest) {
  if (!(await requireSession(req))) return forbidden();
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id");
  if (!bookingId) return NextResponse.json({ error: "booking_id required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, created_at")
    .eq("booking_id", bookingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs?.length) return NextResponse.json({ subscriptions: 0, message: "No push subscriptions found for this booking — guest has not enabled notifications" });

  // Try sending a test push to each subscription
  const results = await Promise.all(
    subs.map(async (s) => {
      const result = await sendPush(s, {
        title: "JOOD Test",
        body: "Push notification is working ✓",
        tag: "push-test",
      });
      return { endpoint: s.endpoint.slice(0, 60) + "…", result };
    })
  );

  return NextResponse.json({ subscriptions: subs.length, results });
}
