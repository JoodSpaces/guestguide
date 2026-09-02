import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSession, forbidden } from "@/lib/admin-auth";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  name_ar: z.string().min(1).max(200),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  city: z.string().min(1).max(100),
  address: z.string().min(1).max(500),
  bedrooms: z.coerce.number().int().min(1).max(50).default(1),
  max_guests: z.coerce.number().int().min(1).max(100).default(2),
  wifi_ssid: z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  if (!(await requireSession(req, ["admin"]))) return forbidden();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, slug, name, name_ar, city, address, bedrooms, max_guests, wifi_ssid")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await requireSession(req, ["admin"]))) return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("properties")
    .insert(parsed.data)
    .select("id, slug, name, name_ar, city, address, bedrooms, max_guests, wifi_ssid")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
