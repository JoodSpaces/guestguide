import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  nameEn: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional(),
  descriptionEn: z.string().max(1000).nullable().optional(),
  descriptionAr: z.string().max(1000).nullable().optional(),
  category: z.enum(["early_checkin", "late_checkout", "transfer", "housekeeping", "amenities", "food", "other"]).optional(),
  priceEgp: z.number().int().min(0).optional(),
  leadHours: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.nameEn !== undefined) updates.name_en = d.nameEn;
  if (d.nameAr !== undefined) updates.name_ar = d.nameAr;
  if (d.descriptionEn !== undefined) updates.description_en = d.descriptionEn;
  if (d.descriptionAr !== undefined) updates.description_ar = d.descriptionAr;
  if (d.category !== undefined) updates.category = d.category;
  if (d.priceEgp !== undefined) updates.price_egp = d.priceEgp;
  if (d.leadHours !== undefined) updates.lead_hours = d.leadHours;
  if (d.isActive !== undefined) updates.is_active = d.isActive;
  if (d.sortOrder !== undefined) updates.sort_order = d.sortOrder;

  const supabase = createServiceClient();
  const { error } = await supabase.from("services").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
