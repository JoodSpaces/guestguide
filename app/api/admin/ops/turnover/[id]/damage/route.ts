import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";

const schema = z.object({
  item_id:   z.string().uuid(),
  quantity:  z.number().int().min(1).max(999),
  condition: z.enum(["damaged", "missing", "needs_cleaning"]),
  notes:     z.string().max(500).nullable().optional(),
});

async function getTaskPropertyId(supabase: ReturnType<typeof createServiceClient>, taskId: string) {
  const { data } = await supabase
    .from("turnover_tasks")
    .select("property_id")
    .eq("id", taskId)
    .single<{ property_id: string }>();
  return data?.property_id ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req, ["admin", "ops", "housekeeping"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const propertyId = await getTaskPropertyId(supabase, id);
  if (!propertyId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!checkPropertyAccess(session, propertyId)) return forbidden();

  const { data, error } = await supabase
    .from("turnover_damage_items")
    .select("id, item_id, quantity, condition, notes, created_at, inventory_items(name, unit, category)")
    .eq("turnover_task_id", id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req, ["admin", "ops", "housekeeping"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();
  const propertyId = await getTaskPropertyId(supabase, id);
  if (!propertyId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!checkPropertyAccess(session, propertyId)) return forbidden();

  const { data, error } = await supabase
    .from("turnover_damage_items")
    .insert({ turnover_task_id: id, ...parsed.data })
    .select("id, item_id, quantity, condition, notes, created_at, inventory_items(name, unit, category)")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(req, ["admin", "ops", "housekeeping"]);
  if (!session) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const url = new URL(req.url);
  const damageId = url.searchParams.get("damageId");
  if (!damageId || !/^[0-9a-f-]{36}$/.test(damageId)) {
    return NextResponse.json({ error: "damageId required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const propertyId = await getTaskPropertyId(supabase, id);
  if (!propertyId) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!checkPropertyAccess(session, propertyId)) return forbidden();

  const { error } = await supabase
    .from("turnover_damage_items")
    .delete()
    .eq("id", damageId)
    .eq("turnover_task_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
