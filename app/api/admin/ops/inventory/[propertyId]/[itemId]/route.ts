import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";

const schema = z.object({
  current_stock: z.number().int().min(0).optional(),
  par_level: z.number().int().min(0).optional(),
  name: z.string().max(100).optional(),
  unit: z.string().max(20).optional(),
  category: z.enum(["linen", "consumables", "kitchen", "amenities", "general"]).optional(),
});

function validate(propertyId: string, itemId: string) {
  return /^[0-9a-f-]{36}$/.test(propertyId) && /^[0-9a-f-]{36}$/.test(itemId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string; itemId: string }> }
) {
  const session = await requireSession(req, ["admin", "ops", "housekeeping"]);
  if (!session) return forbidden();
  const { propertyId, itemId } = await params;
  if (!validate(propertyId, itemId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  if (!checkPropertyAccess(session, propertyId)) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();

  // Keep reorder_threshold_default in sync with par_level so DB triggers use the right threshold
  const itemUpdate: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.par_level !== undefined) {
    itemUpdate.reorder_threshold_default = parsed.data.par_level;
  }

  const { error } = await supabase
    .from("inventory_items")
    .update(itemUpdate)
    .eq("id", itemId)
    .eq("property_id", propertyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync property_inventory when stock or threshold changes
  if (parsed.data.current_stock !== undefined || parsed.data.par_level !== undefined) {
    const piUpdate: Record<string, unknown> = { property_id: propertyId, item_id: itemId, updated_at: new Date().toISOString() };
    if (parsed.data.current_stock !== undefined) piUpdate.quantity = parsed.data.current_stock;
    if (parsed.data.par_level !== undefined) piUpdate.reorder_threshold = parsed.data.par_level;

    await supabase
      .from("property_inventory")
      .upsert(piUpdate, { onConflict: "property_id,item_id" });

    // Fire low-stock check so alerts are created/resolved immediately on manual stock change
    if (parsed.data.current_stock !== undefined) {
      await supabase.rpc("check_low_stock", { p_property_id: propertyId, p_item_id: itemId });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string; itemId: string }> }
) {
  const session = await requireSession(req, ["admin", "ops"]);
  if (!session) return forbidden();
  const { propertyId, itemId } = await params;
  if (!validate(propertyId, itemId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  if (!checkPropertyAccess(session, propertyId)) return forbidden();

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", itemId)
    .eq("property_id", propertyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
