import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";
import { isUniqueViolation } from "@/lib/inventory";

const schema = z.object({
  category: z.enum(["linen", "consumables", "kitchen", "amenities", "general"]),
  name: z.string().trim().min(1).max(100),
  unit: z.string().max(20).default("pcs"),
  par_level: z.number().int().min(0).max(100000).default(0),
  current_stock: z.number().int().min(0).max(100000).default(0),
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
  // property_inventory.quantity is the one stock number (current_stock on the item only mirrors it).
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, property_inventory(quantity, damaged_quantity, last_restocked_at)")
    .eq("property_id", propertyId)
    .is("archived_at", null)
    .order("category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
  if (!parsed.success) return NextResponse.json({ error: "validation_error", message: "Give the item a name, and whole numbers for stock and par." }, { status: 400 });
  const { current_stock, ...fields } = parsed.data;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ property_id: propertyId, ...fields })
    .select("id")
    .single<{ id: string }>();

  if (isUniqueViolation(error)) {
    return NextResponse.json({ error: "duplicate_name", message: `"${fields.name}" is already on this property's list. Change its count instead.` }, { status: 409 });
  }
  if (error || !data) return NextResponse.json({ error: "create_failed", message: "Could not add the item." }, { status: 500 });

  // The starting count goes through the same recorded path as every other change (and applies the low-stock rule).
  const { error: adjustErr } = await supabase.rpc("adjust_inventory", {
    p_property_id: propertyId, p_item_id: data.id, p_set: current_stock, p_actor: session.name, p_note: "Initial count",
  });
  if (adjustErr) {
    await supabase.from("inventory_items").delete().eq("id", data.id);   // nothing half-made is left behind
    console.error("[inventory] initial count failed:", adjustErr.message);
    return NextResponse.json({ error: "create_failed", message: "Could not add the item." }, { status: 500 });
  }
  await supabase.rpc("check_low_stock", { p_property_id: propertyId, p_item_id: data.id });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
