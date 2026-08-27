import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  section: z.string().min(1).max(40),
  sort_order: z.number().int().min(0),
  title_en: z.string().max(120).default(""),
  title_ar: z.string().max(120).default(""),
  body_en: z.string().max(4000).default(""),
  body_ar: z.string().max(4000).default(""),
  is_published: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify property exists
  const { data: prop } = await supabase.from("properties").select("id").eq("id", id).single();
  if (!prop) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await supabase
    .from("property_content")
    .insert({ property_id: id, ...parsed.data })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
