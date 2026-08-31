import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";

const schema = z.object({
  checked: z.boolean().optional(),
  photo_url: z.string().url().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  if (!(await requireSession(req, ["admin", "ops", "housekeeping"]))) return forbidden();
  const { id, itemId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f-]{36}$/.test(itemId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.checked === true) updates.checked_at = new Date().toISOString();
  if (parsed.data.checked === false) updates.checked_at = null;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("turnover_items")
    .update(updates)
    .eq("id", itemId)
    .eq("task_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
