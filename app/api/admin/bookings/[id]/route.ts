import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { encrypt, decrypt } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { buildChecklist, DEFAULT_CHECKLIST, type PropertySpecs } from "@/lib/ops-checklist";
import { requireSession, forbidden } from "@/lib/admin-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req, ["admin", "ops", "concierge"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, guest_first_name, guest_last_name, guest_email, guest_phone, guest_lang, guest_count, check_in, check_out, status, source, external_ref, door_code_encrypted, created_at, property_id, dnd_active, properties(id, name, name_ar)")
    .eq("id", id)
    .single();

  if (error || !booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let doorCode: string | null = null;
  if (booking.door_code_encrypted) {
    try { doorCode = decrypt(booking.door_code_encrypted as string); } catch { /* different key */ }
  }
  let guestPhone: string | null = null;
  if (booking.guest_phone) {
    try { guestPhone = decrypt(booking.guest_phone as string); } catch { guestPhone = booking.guest_phone as string; }
  }

  const [{ data: arrivalPrefs }, { data: tokens }, { data: rating }] = await Promise.all([
    supabase.from("arrival_preferences").select("occasion, temp_pref, notes, submitted_at").eq("booking_id", id).maybeSingle(),
    supabase.from("stay_tokens").select("id, open_count, first_opened_at, last_opened_at, revoked_at, expires_at").eq("booking_id", id).order("issued_at", { ascending: false }),
    supabase.from("stay_ratings").select("stars, comment, created_at").eq("booking_id", id).maybeSingle(),
  ]);

  return NextResponse.json({ ...booking, door_code_encrypted: undefined, doorCode, guestPhone, arrivalPrefs, tokens, rating });
}

const schema = z
  .object({
    doorCode: z.string().max(20).nullable().optional(),
    status: z.enum(["confirmed", "cancelled", "completed"]).optional(),
  })
  .refine((d) => d.doorCode !== undefined || d.status !== undefined, {
    message: "At least one field required",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req, ["admin"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServiceClient();
  const updates: Record<string, unknown> = {};

  if (parsed.data.doorCode !== undefined) {
    updates.door_code_encrypted = parsed.data.doorCode ? encrypt(parsed.data.doorCode) : null;
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
  }

  // Fix 5: prevent completing a booking more than 24 h before checkout
  if (parsed.data.status === "completed") {
    const { data: cur } = await supabase
      .from("bookings")
      .select("check_out")
      .eq("id", id)
      .single<{ check_out: string }>();
    if (cur) {
      const msUntilCheckout = new Date(cur.check_out).getTime() - Date.now();
      if (msUntilCheckout > 24 * 60 * 60 * 1000) {
        return NextResponse.json(
          { error: "Cannot mark a booking completed more than 24 h before checkout" },
          { status: 422 }
        );
      }
    }
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select("property_id")
    .single<{ property_id: string }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // When booking is completed, activate the scheduled turnover (or create one if missing)
  if (parsed.data.status === "completed" && booking?.property_id) {
    const { data: existing } = await supabase
      .from("turnover_tasks")
      .select("id")
      .eq("booking_id", id)
      .eq("status", "scheduled")
      .maybeSingle<{ id: string }>();

    if (existing) {
      await supabase.from("turnover_tasks").update({ status: "pending" }).eq("id", existing.id);
    } else {
      const { data: task } = await supabase
        .from("turnover_tasks")
        .insert({ booking_id: id, property_id: booking.property_id, status: "pending" })
        .select("id")
        .single<{ id: string }>();

      if (task) {
        const { data: propData } = await supabase
          .from("properties")
          .select("specs")
          .eq("id", booking.property_id)
          .single<{ specs: PropertySpecs | null }>();
        const specs = propData?.specs;
        const checklist =
          specs && Array.isArray(specs.rooms) && specs.rooms.length > 0
            ? buildChecklist(specs)
            : DEFAULT_CHECKLIST;
        await supabase.from("turnover_items").insert(
          checklist.map((item) => ({
            task_id: task.id,
            room: item.room,
            label: item.label,
            sort_order: item.sort_order,
          }))
        );
      }
    }
  }

  await supabase.from("audit_log").insert({
    actor_type: "admin",
    actor_id: session.id,
    action: "booking_updated",
    entity: "bookings",
    entity_id: id,
    meta: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
