import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";
import { sendPushToBooking } from "@/lib/push";

const PUSH_MSG: Record<string, { en: string; ar: string }> = {
  in_progress: { en: "We're on it! 🛎️", ar: "جارٍ المعالجة! 🛎️" },
  resolved:    { en: "Your request is resolved ✓", ar: "تم حل طلبك ✓" },
};

const patchSchema = z.object({
  status: z.enum(["received", "in_progress", "resolved"]).optional(),
  adminNotes: z.string().max(1000).nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("guest_requests")
    .select("*, bookings(guest_first_name, guest_last_name, check_in, check_out, properties(name))")
    .eq("id", id)
    .single();

  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req, ["admin", "ops", "concierge"]))) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.adminNotes !== undefined) updates.admin_notes = parsed.data.adminNotes;

  const supabase = createServiceClient();
  const { data: updatedReq, error } = await supabase
    .from("guest_requests")
    .update(updates)
    .eq("id", id)
    .select("booking_id, status, bookings(guest_lang)")
    .single<{ booking_id: string; status: string; bookings: { guest_lang: string } | { guest_lang: string }[] }>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (updatedReq) {
    const guestLang = Array.isArray(updatedReq.bookings) ? updatedReq.bookings[0]?.guest_lang : updatedReq.bookings?.guest_lang;
    const isAr = guestLang === "ar";

    // Status change → push
    if (parsed.data.status && PUSH_MSG[parsed.data.status]) {
      const msg = PUSH_MSG[parsed.data.status];
      sendPushToBooking(updatedReq.booking_id, {
        title: "JOOD",
        body: isAr ? msg.ar : msg.en,
        tag: `request-${id}`,
      }, supabase).catch(e => console.error("[push] status push failed", e));
    }
    // New note → push (only when note is non-empty and no status change in same request)
    else if (parsed.data.adminNotes) {
      console.log("[push] triggering note push for booking", updatedReq.booking_id);
      sendPushToBooking(updatedReq.booking_id, {
        title: isAr ? "رسالة من فريق JOOD" : "Message from JOOD",
        body: isAr ? "لديك رد جديد على طلبك" : "You have a new reply on your request",
        tag: `request-${id}`,
      }, supabase).catch(e => console.error("[push] note push failed", e));
    }
  }

  return NextResponse.json({ ok: true });
}
