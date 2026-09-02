import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";

const schema = z.object({
  category: z.enum(["linen", "consumables", "kitchen", "amenities", "general"]),
  name: z.string().min(1).max(100),
  unit: z.string().max(20).default("pcs"),
  par_level: z.number().int().min(0).default(0),
  current_stock: z.number().int().min(0).default(0),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const session = await requireSession(req, ["admin", "ops", "housekeeping"]);
  if (!session) return forbidden();
  const { propertyId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(propertyId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  if (!checkPropertyAccess(session, propertyId)) return forbidden();

  const supabase = createServiceClient();
  // Join property_inventory for trigger-maintained quantity (authoritative after damage/supply ops)
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, property_inventory(quantity, damaged_quantity, last_restocked_at)")
    .eq("property_id", propertyId)
    .order("category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Prefer property_inventory.quantity when available; fall back to current_stock
  const rows = (data ?? []).map((item) => {
    const pi = Array.isArray(item.property_inventory) ? item.property_inventory[0] : item.property_inventory;
    return { ...item, property_inventory: undefined, current_stock: pi?.quantity ?? item.current_stock, damaged_quantity: pi?.damaged_quantity ?? 0, last_restocked_at: pi?.last_restocked_at ?? null };
  });

  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const session = await requireSession(req, ["admin", "ops"]);
  if (!session) return forbidden();
  const { propertyId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(propertyId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  if (!checkPropertyAccess(session, propertyId)) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ property_id: propertyId, ...parsed.data })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 });

  // Seed property_inventory so triggers and alerts have a starting quantity
  if (parsed.data.current_stock > 0) {
    await supabase
      .from("property_inventory")
      .upsert(
        { property_id: propertyId, item_id: data.id, quantity: parsed.data.current_stock },
        { onConflict: "property_id,item_id" }
      );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
