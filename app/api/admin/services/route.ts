import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";

const schema = z.object({
  nameEn: z.string().min(1).max(200),
  nameAr: z.string().max(200).default(""),
  descriptionEn: z.string().max(1000).nullish(),
  descriptionAr: z.string().max(1000).nullish(),
  category: z.enum(["early_checkin", "late_checkout", "transfer", "housekeeping", "amenities", "food", "other"]).default("other"),
  priceEgp: z.number().int().min(0).default(0),
  leadHours: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  if (!(await requireSession(req, ["admin"]))) return forbidden();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await requireSession(req, ["admin"]))) return forbidden();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 400 });

  const d = parsed.data;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      name_en: d.nameEn,
      name_ar: d.nameAr,
      description_en: d.descriptionEn ?? null,
      description_ar: d.descriptionAr ?? null,
      category: d.category,
      price_egp: d.priceEgp,
      lead_hours: d.leadHours,
      is_active: d.isActive,
      sort_order: d.sortOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
