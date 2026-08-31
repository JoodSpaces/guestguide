import { createServiceClient } from "@/lib/supabase/server";
import { BookingsListClient, type Booking } from "@/components/admin/BookingsListClient";

export default async function AdminBookingsPage() {
  const supabase = createServiceClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, guest_first_name, guest_last_name, check_in, check_out, status, source, properties(name)")
    .order("check_in", { ascending: false })
    .returns<Booking[]>();

  return <BookingsListClient initialBookings={bookings ?? []} />;
}
