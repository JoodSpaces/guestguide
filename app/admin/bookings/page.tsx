import { createServiceClient } from "@/lib/supabase/server";
import { BookingsCalendarClient, type Booking } from "@/components/admin/BookingsCalendarClient";

export default async function AdminBookingsPage() {
  const supabase = createServiceClient();

  const [{ data: bookings }, { data: properties }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, check_in, check_out, status, source, property_id, properties(id, name)")
      .order("check_in", { ascending: true })
      .returns<Booking[]>(),
    supabase.from("properties").select("id, name").order("name"),
  ]);

  return (
    <BookingsCalendarClient
      initialBookings={bookings ?? []}
      properties={(properties ?? []) as { id: string; name: string }[]}
    />
  );
}
