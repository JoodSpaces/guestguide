import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { scopeFromHeaders } from "@/lib/admin-scope";
import { BookingsCalendarClient, type Booking } from "@/components/admin/BookingsCalendarClient";

export default async function AdminBookingsPage() {
  const supabase = createServiceClient();
  const scope = scopeFromHeaders(await headers());

  let bookingsQuery = supabase
    .from("bookings")
    .select("id, guest_first_name, guest_last_name, check_in, check_out, status, source, property_id, properties(id, name)")
    .order("check_in", { ascending: true });
  let propertiesQuery = supabase.from("properties").select("id, name").order("name");
  if (scope) {
    bookingsQuery = bookingsQuery.in("property_id", scope);
    propertiesQuery = propertiesQuery.in("id", scope);
  }

  const [{ data: bookings }, { data: properties }] = await Promise.all([
    bookingsQuery.returns<Booking[]>(),
    propertiesQuery,
  ]);

  return (
    <BookingsCalendarClient
      initialBookings={bookings ?? []}
      properties={(properties ?? []) as { id: string; name: string }[]}
    />
  );
}
