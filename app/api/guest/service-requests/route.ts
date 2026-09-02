import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";
import { notifyAdminServiceRequest, confirmGuestServiceRequest } from "@/lib/email";

const schema = z.object({
  token: z.string(),
  serviceId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
  guestNotes: z.string().max(500).nullish(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();

  const [{ data: service }, { data: property }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name_en")
      .eq("id", parsed.data.serviceId)
      .eq("is_active", true)
      .single<{ id: string; name_en: string }>(),
    supabase
      .from("properties")
      .select("name")
      .eq("id", booking.property_id)
      .single<{ name: string }>(),
  ]);

  if (!service) return NextResponse.json({ error: "service_not_found" }, { status: 404 });

  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      booking_id: booking.id,
      service_id: parsed.data.serviceId,
      quantity: parsed.data.quantity,
      guest_notes: parsed.data.guestNotes ?? null,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const guestName = `${booking.guest_first_name} ${booking.guest_last_name}`;
  const propertyName = property?.name ?? "the property";

  notifyAdminServiceRequest({
    guestName,
    propertyName,
    serviceName: service.name_en,
    quantity: parsed.data.quantity,
    requestId: data.id,
  });

  if (booking.guest_email) {
    confirmGuestServiceRequest({
      guestEmail: booking.guest_email,
      guestFirstName: booking.guest_first_name,
      serviceName: service.name_en,
      quantity: parsed.data.quantity,
    });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
