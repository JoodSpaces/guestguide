import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

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
  const { propertyId, itemId } = await params;
  if (!validate(propertyId, itemId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("inventory_items")
    .update(parsed.data)
    .eq("id", itemId)
    .eq("property_id", propertyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string; itemId: string }> }
) {
  const { propertyId, itemId } = await params;
  if (!validate(propertyId, itemId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", itemId)
    .eq("property_id", propertyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
