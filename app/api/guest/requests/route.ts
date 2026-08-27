import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";
import { notifyAdminGuestRequest, confirmGuestRequest } from "@/lib/email";

const postSchema = z.object({
  token: z.string(),
  category: z.enum(["maintenance", "housekeeping", "supplies", "service", "other"]).default("other"),
  body: z.string().min(1).max(2000),
  urgency: z.enum(["normal", "urgent"]).default("normal"),
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const booking = await getBookingFromToken(token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("guest_requests")
    .select("id, category, body, urgency, status, admin_notes, created_at")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();

  const [insertResult, { data: property }] = await Promise.all([
    supabase
      .from("guest_requests")
      .insert({
        booking_id: booking.id,
        category: parsed.data.category,
        body: parsed.data.body,
        urgency: parsed.data.urgency,
        status: "received",
      })
      .select("id")
      .single<{ id: string }>(),
    supabase
      .from("properties")
      .select("name")
      .eq("id", booking.property_id)
      .single<{ name: string }>(),
  ]);

  if (insertResult.error) return NextResponse.json({ error: insertResult.error.message }, { status: 500 });

  const guestName = `${booking.guest_first_name} ${booking.guest_last_name}`;
  const propertyName = property?.name ?? "the property";

  notifyAdminGuestRequest({
    guestName,
    propertyName,
    category: parsed.data.category,
    body: parsed.data.body,
    urgency: parsed.data.urgency,
    requestId: insertResult.data.id,
  });

  if (booking.guest_email) {
    confirmGuestRequest({
      guestEmail: booking.guest_email,
      guestFirstName: booking.guest_first_name,
      category: parsed.data.category,
    });
  }

  return NextResponse.json({ id: insertResult.data.id }, { status: 201 });
}
