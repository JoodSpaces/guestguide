import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { encrypt } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_CHECKLIST } from "@/lib/ops-checklist";

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

  const { data: booking, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select("property_id")
    .single<{ property_id: string }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-create turnover task when booking is marked completed
  if (parsed.data.status === "completed" && booking?.property_id) {
    const { data: task } = await supabase
      .from("turnover_tasks")
      .insert({ booking_id: id, property_id: booking.property_id, status: "pending" })
      .select("id")
      .single<{ id: string }>();

    if (task) {
      await supabase.from("turnover_items").insert(
        DEFAULT_CHECKLIST.map((item) => ({
          task_id: task.id,
          room: item.room,
          label: item.label,
          sort_order: item.sort_order,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}
