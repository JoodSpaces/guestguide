import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  status: z.enum(["pending", "in_progress", "ready", "approved"]).optional(),
  assigned_to: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  condition: z.enum(["excellent", "good", "fair", "damaged"]).nullable().optional(),
  damage_notes: z.string().max(2000).nullable().optional(),
  approved_by: z.string().max(100).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const [{ data: task }, { data: items }] = await Promise.all([
    supabase
      .from("turnover_tasks")
      .select(`id, status, assigned_to, notes, condition, damage_notes, created_at, started_at, completed_at, approved_at, approved_by, properties(id, name), bookings(id, check_in, check_out, guest_first_name, guest_last_name)`)
      .eq("id", id)
      .single(),
    supabase
      .from("turnover_items")
      .select("id, room, label, checked, checked_at, photo_url, notes, sort_order")
      .eq("task_id", id)
      .order("sort_order"),
  ]);

  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ task, items: items ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const updates: Record<string, unknown> = { ...parsed.data };
  const now = new Date().toISOString();

  if (parsed.data.status === "in_progress") updates.started_at = now;
  if (parsed.data.status === "ready") updates.completed_at = now;
  if (parsed.data.status === "approved") updates.approved_at = now;

  const supabase = createServiceClient();
  const { error } = await supabase.from("turnover_tasks").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
