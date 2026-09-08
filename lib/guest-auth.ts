import { hashToken } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";

export interface GuestBooking {
  id: string;
  property_id: string;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string | null;
  check_in: string;
  check_out: string;
}

export async function getBookingFromToken(token: string): Promise<GuestBooking | null> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return null;
  const hash = hashToken(token);
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("stay_tokens")
    .select("booking_id, revoked_at, expires_at, bookings(id, property_id, guest_first_name, guest_last_name, guest_email, check_in, check_out)")
    .eq("token_hash", hash)
    .single<{
      booking_id: string;
      revoked_at: string | null;
      expires_at: string;
      bookings: GuestBooking | GuestBooking[];
    }>();

  if (!data || data.revoked_at) return null;
  if (data.expires_at && new Date() > new Date(data.expires_at)) return null;

  const booking = Array.isArray(data.bookings) ? data.bookings[0] : data.bookings;
  if (!booking) return null;

  return booking;
}
