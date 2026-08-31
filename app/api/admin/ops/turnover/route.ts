import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_CHECKLIST } from "@/lib/ops-checklist";
import { requireSession, forbidden } from "@/lib/admin-auth";

const createSchema = z.object({
  propertyId: z.string().uuid(),
  bookingId: z.string().uuid().optional(),
  assignedTo: z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireSession(req, ["admin", "ops", "housekeeping"]))) return forbidden();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("turnover_tasks")
    .select(`
      id, status, assigned_to, created_at, condition,
      properties(id, name),
      bookings(id, check_in, check_out, guest_first_name, guest_last_name)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await requireSession(req, ["admin", "ops", "housekeeping"]))) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const { propertyId, bookingId, assignedTo } = parsed.data;
  const supabase = createServiceClient();

  const { data: task, error } = await supabase
    .from("turnover_tasks")
    .insert({
      property_id: propertyId,
      booking_id: bookingId ?? null,
      assigned_to: assignedTo ?? null,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !task) return NextResponse.json({ error: error?.message }, { status: 500 });

  await supabase.from("turnover_items").insert(
    DEFAULT_CHECKLIST.map((item) => ({
      task_id: task.id,
      room: item.room,
      label: item.label,
      sort_order: item.sort_order,
    }))
  );

  return NextResponse.json({ id: task.id }, { status: 201 });
}
