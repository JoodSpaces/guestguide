import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { createPaymentLink } from "@/lib/paymob";

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "fulfill", "regenerate_link"]).optional(),
  adminNotes: z.string().max(1000).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("service_requests")
    .select("*, services(*), bookings(id, guest_first_name, guest_last_name, guest_email, properties(name))")
    .eq("id", id)
    .single();

  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();
  const updates: Record<string, unknown> = {};
  const now = new Date().toISOString();

  if (parsed.data.adminNotes !== undefined) updates.admin_notes = parsed.data.adminNotes;

  if (parsed.data.action === "reject") {
    updates.status = "rejected";
    updates.rejected_at = now;
    updates.updated_at = now;
  }

  if (parsed.data.action === "fulfill") {
    updates.status = "fulfilled";
    updates.fulfilled_at = now;
    updates.updated_at = now;
  }

  if (parsed.data.action === "approve" || parsed.data.action === "regenerate_link") {
    // Fetch request + booking details to call Paymob
    const { data: sr } = await supabase
      .from("service_requests")
      .select("id, quantity, services(price_egp, name_en), bookings(guest_first_name, guest_last_name, guest_email)")
      .eq("id", id)
      .single<{
        id: string;
        quantity: number;
        services: { price_egp: number; name_en: string } | null;
        bookings: { guest_first_name: string; guest_last_name: string; guest_email: string | null } | null;
      }>();

    if (!sr) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const service = sr.services;
    const booking = Array.isArray(sr.bookings) ? sr.bookings[0] : sr.bookings;
    const priceEgp = (service?.price_egp ?? 0) * sr.quantity;

    if (priceEgp > 0) {
      try {
        const { paymobOrderId, paymentUrl } = await createPaymentLink({
          serviceRequestId: id,
          amountEgp: priceEgp,
          guestFirstName: booking?.guest_first_name ?? "Guest",
          guestLastName: booking?.guest_last_name ?? "",
          guestEmail: booking?.guest_email,
        });
        updates.paymob_order_id = paymobOrderId;
        updates.paymob_payment_url = paymentUrl;
      } catch (err) {
        console.error("Paymob error:", err);
        return NextResponse.json({ error: "payment_link_failed", message: String(err) }, { status: 502 });
      }
    }

    updates.status = "approved";
    updates.updated_at = now;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("service_requests").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Re-fetch to return updated record
  const { data: updated } = await supabase
    .from("service_requests")
    .select("status, paymob_payment_url, fulfilled_at, rejected_at")
    .eq("id", id)
    .single();

  return NextResponse.json({ ok: true, ...updated });
}
