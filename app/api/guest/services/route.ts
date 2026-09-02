import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const booking = await getBookingFromToken(token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();
  const [{ data: services }, { data: myRequests }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .or(`property_id.is.null,property_id.eq.${booking.property_id}`)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("service_requests")
      .select("id, service_id, quantity, status, guest_notes, paymob_payment_url, created_at, services(name_en, price_egp)")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({ services: services ?? [], myRequests: myRequests ?? [] });
}
