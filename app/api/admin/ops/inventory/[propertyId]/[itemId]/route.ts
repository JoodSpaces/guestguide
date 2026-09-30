import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden, checkPropertyAccess } from "@/lib/admin-auth";
import { isUniqueViolation } from "@/lib/inventory";

// Stock changes are RELATIVE (`delta`: +3, -1, safe when a turnover or a service changes the same item at the same
// moment) or a recount (`current_stock`). Give one, not both. Every change is recorded with who made it.
const schema = z
  .object({
    delta: z.number().int().min(-100000).max(100000).optional(),
    current_stock: z.number().int().min(0).max(100000).optional(),
    par_level: z.number().int().min(0).max(100000).optional(),
    name: z.string().trim().min(1).max(100).optional(),
    unit: z.string().max(20).optional(),
    category: z.enum(["linen", "consumables", "kitchen", "amenities", "general"]).optional(),
  })
  .refine((d) => !(d.delta !== undefined && d.current_stock !== undefined), { message: "Give delta or current_stock, not both" });

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
  const { delta, current_stock, par_level, ...details } = parsed.data;

  // Housekeeping counts stock; changing what an item is, or its par, is for admin / ops (same as adding and removing).
  const editsItem = par_level !== undefined || Object.values(details).some((v) => v !== undefined);
  if (editsItem && session.role === "housekeeping") return forbidden();

  const supabase = createServiceClient();

  const { data: item } = await supabase
    .from("inventory_items").select("id").eq("id", itemId).eq("property_id", propertyId).is("archived_at", null)
    .maybeSingle<{ id: string }>();
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fields: Record<string, unknown> = { ...details };
  if (par_level !== undefined) fields.par_level = par_level;
  if (Object.keys(fields).length) {
    const { error } = await supabase.from("inventory_items").update(fields).eq("id", itemId).eq("property_id", propertyId);
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "duplicate_name", message: "Another item here already has that name." }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: "update_failed", message: "Could not save." }, { status: 500 });
  }

  let quantity: number | null = null;
  if (delta !== undefined || current_stock !== undefined) {
    const { data, error } = await supabase.rpc("adjust_inventory", {
      p_property_id: propertyId, p_item_id: itemId,
      p_delta: delta ?? null, p_set: current_stock ?? null, p_actor: session.name,
    });
    if (error) {
      console.error("[inventory] adjust failed:", error.message);
      return NextResponse.json({ error: "update_failed", message: "Could not save the count." }, { status: 500 });
    }
    quantity = typeof data === "number" ? data : null;
  }

  // A new par changes what counts as low: apply the rule now, not at the next stock change.
  if (par_level !== undefined) await supabase.rpc("check_low_stock", { p_property_id: propertyId, p_item_id: itemId });

  return NextResponse.json({ ok: true, current_stock: quantity });
}

// "Remove" archives the item: it leaves every list and stops alerting, but its history (counts, damage, who changed
// what) is kept. Nothing is destroyed.
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
  const { data, error } = await supabase
    .from("inventory_items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", itemId).eq("property_id", propertyId).is("archived_at", null)
    .select("id");

  if (error) return NextResponse.json({ error: "delete_failed", message: "Could not remove the item." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await supabase
    .from("inventory_alerts").update({ resolved_at: new Date().toISOString() })
    .eq("property_id", propertyId).eq("item_id", itemId).is("resolved_at", null);

  return NextResponse.json({ ok: true });
}
