import { createServiceClient } from "@/lib/supabase/server";
import { RequestsListClient } from "@/components/admin/RequestsListClient";

export default async function RequestsPage() {
  const supabase = createServiceClient();

  const [{ data: serviceRequests }, { data: guestRequests }] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, status, quantity, guest_notes, created_at, services(name_en, price_egp), bookings(guest_first_name, guest_last_name, properties(name))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("guest_requests")
      .select("id, category, body, urgency, status, created_at, bookings(guest_first_name, guest_last_name, properties(name))")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <RequestsListClient
      initialServiceReqs={(serviceRequests as never) ?? []}
      initialGuestReqs={(guestRequests as never) ?? []}
    />
  );
}
