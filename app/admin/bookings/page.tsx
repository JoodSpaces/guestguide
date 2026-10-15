import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { scopeFromHeaders } from "@/lib/admin-scope";
import { BookingsListClient, type Booking } from "@/components/admin/BookingsListClient";

export const dynamic = "force-dynamic";

/** All bookings, searchable. The month view (with what Airbnb and the other channels hold) is the Calendar. */
export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const supabase = createServiceClient();
  const scope = scopeFromHeaders(await headers());
  const sp = await searchParams;

  let query = supabase
    .from("bookings")
    .select("id, guest_first_name, guest_last_name, check_in, check_out, status, source, properties(name)")
    .order("check_in", { ascending: false })
    .limit(500);
  if (scope) query = query.in("property_id", scope);

  const { data, error } = await query.returns<Booking[]>();

  return (
    <>
      {error && (
        <p role="alert" style={{ background: "rgba(255,96,55,.12)", color: "#A8431F", borderRadius: 14, padding: "10px 14px", fontSize: ".85rem", margin: "0 0 14px" }}>
          Could not read the bookings: {error.message}. The list below may be incomplete.
        </p>
      )}
      <BookingsListClient initialBookings={data ?? []} initialQuery={typeof sp.q === "string" ? sp.q.slice(0, 80) : ""} />
    </>
  );
}
