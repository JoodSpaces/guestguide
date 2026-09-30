import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { scopeFromHeaders } from "@/lib/admin-scope";
import { BookingsCalendarClient, type Booking, type ExternalRange } from "@/components/admin/BookingsCalendarClient";
import { externalBlocks, BLOCK_LABEL } from "@/lib/website-calendar";

export default async function AdminBookingsPage() {
  const supabase = createServiceClient();
  const scope = scopeFromHeaders(await headers());

  let bookingsQuery = supabase
    .from("bookings")
    .select("id, guest_first_name, guest_last_name, check_in, check_out, status, source, property_id, properties(id, name)")
    .order("check_in", { ascending: true });
  let propertiesQuery = supabase.from("properties").select("id, name, slug").order("name");
  if (scope) {
    bookingsQuery = bookingsQuery.in("property_id", scope);
    propertiesQuery = propertiesQuery.in("id", scope);
  }

  const [{ data: bookings }, { data: properties }] = await Promise.all([
    bookingsQuery.returns<Booking[]>(),
    propertiesQuery,
  ]);

  // What the website's other channels (Airbnb, Booking.com…) and staff holds have taken, shown read-only.
  const props = (properties ?? []) as { id: string; name: string; slug: string }[];
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const blocks = await externalBlocks(props.map((p) => p.slug), day(-62), day(430));
  const bySlug = new Map(props.map((p) => [p.slug, p]));
  const external: ExternalRange[] = blocks.flatMap((b) => {
    const p = bySlug.get(b.slug);
    return p ? [{ propertyId: p.id, propertyName: p.name, label: BLOCK_LABEL[b.kind] ?? "Blocked", from: b.from, to: b.to }] : [];
  });

  return (
    <BookingsCalendarClient
      initialBookings={bookings ?? []}
      properties={props.map(({ id, name }) => ({ id, name }))}
      externalBlocks={external}
    />
  );
}
