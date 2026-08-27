import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  category: z.enum(["linen", "consumables", "kitchen", "amenities", "general"]),
  name: z.string().min(1).max(100),
  unit: z.string().max(20).default("pcs"),
  par_level: z.number().int().min(0).default(0),
  current_stock: z.number().int().min(0).default(0),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(propertyId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("property_id", propertyId)
    .order("category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const { propertyId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(propertyId)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

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
  return NextResponse.json({ id: data.id }, { status: 201 });
}
