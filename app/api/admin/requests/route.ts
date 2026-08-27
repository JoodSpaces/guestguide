import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();

  const [{ data: serviceRequests }, { data: guestRequests }] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, status, quantity, guest_notes, created_at, services(name_en, price_egp), bookings(guest_first_name, guest_last_name, properties(name))")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("guest_requests")
      .select("id, category, body, urgency, status, created_at, bookings(guest_first_name, guest_last_name, properties(name))")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    serviceRequests: serviceRequests ?? [],
    guestRequests: guestRequests ?? [],
  });
}
