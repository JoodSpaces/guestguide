import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";
import { notifyAdminGuestRequest, confirmGuestRequest } from "@/lib/email";
import { classifyGuestRequest } from "@/lib/classify-request";

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
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();

  // Classify and fetch property in parallel; classify may fail gracefully
  const [classification, { data: property }] = await Promise.all([
    classifyGuestRequest(parsed.data.body).catch(() => ({
      category: parsed.data.category,
      urgency: parsed.data.urgency,
    })),
    supabase
      .from("properties")
      .select("name")
      .eq("id", booking.property_id)
      .single<{ name: string }>(),
  ]);

  // AI category is authoritative; urgency escalates but never de-escalates
  const finalCategory = classification.category;
  const finalUrgency =
    parsed.data.urgency === "urgent" || classification.urgency === "urgent"
      ? "urgent"
      : "normal";

  const insertResult = await supabase
    .from("guest_requests")
    .insert({
      booking_id: booking.id,
      category: finalCategory,
      body: parsed.data.body,
      urgency: finalUrgency,
      status: "received",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertResult.error) return NextResponse.json({ error: insertResult.error.message }, { status: 500 });

  const guestName = `${booking.guest_first_name} ${booking.guest_last_name}`;
  const propertyName = property?.name ?? "the property";

  notifyAdminGuestRequest({
    guestName,
    propertyName,
    category: finalCategory,
    body: parsed.data.body,
    urgency: finalUrgency,
    requestId: insertResult.data.id,
  });

  if (booking.guest_email) {
    confirmGuestRequest({
      guestEmail: booking.guest_email,
      guestFirstName: booking.guest_first_name,
      category: finalCategory,
    });
  }

  return NextResponse.json({ id: insertResult.data.id, category: finalCategory, urgency: finalUrgency }, { status: 201 });
}
