import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  section: z.string().min(1).max(40).optional(),
  sort_order: z.number().int().min(0).optional(),
  title_en: z.string().max(120).optional(),
  title_ar: z.string().max(120).optional(),
  body_en: z.string().max(4000).optional(),
  body_ar: z.string().max(4000).optional(),
  is_published: z.boolean().optional(),
});

function validateIds(propertyId: string, sectionId: string) {
  return /^[0-9a-f-]{36}$/.test(propertyId) && /^[0-9a-f-]{36}$/.test(sectionId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  if (!validateIds(id, sectionId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("property_content")
    .update(parsed.data)
    .eq("id", sectionId)
    .eq("property_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const { id, sectionId } = await params;
  if (!validateIds(id, sectionId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("property_content")
    .delete()
    .eq("id", sectionId)
    .eq("property_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
