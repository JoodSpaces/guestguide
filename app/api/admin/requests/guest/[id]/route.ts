import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  status: z.enum(["received", "in_progress", "resolved"]).optional(),
  adminNotes: z.string().max(1000).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.adminNotes !== undefined) updates.admin_notes = parsed.data.adminNotes;

  const supabase = createServiceClient();
  const { error } = await supabase.from("guest_requests").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
