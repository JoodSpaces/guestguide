import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";

const schema = z.object({
  token: z.string(),
  rating: z.number().int().min(1).max(3),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();

  // Verify the request belongs to this booking and is fulfilled
  const { data: existing } = await supabase
    .from("service_requests")
    .select("id, booking_id, status")
    .eq("id", id)
    .eq("booking_id", booking.id)
    .eq("status", "fulfilled")
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await supabase
    .from("service_requests")
    .update({ guest_rating: parsed.data.rating })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
