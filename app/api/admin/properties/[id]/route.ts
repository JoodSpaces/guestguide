import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminCookie } from "@/lib/admin-auth";

async function requireAdmin(req: NextRequest) {
  const cookie = req.cookies.get("jood_admin")?.value;
  if (!cookie) return null;
  const session = await verifyAdminCookie(cookie);
  return session?.role === "admin" ? session : null;
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  name_ar: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
  city: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(500).optional(),
  bedrooms: z.coerce.number().int().min(1).max(50).optional(),
  max_guests: z.coerce.number().int().min(1).max(100).optional(),
  wifi_ssid: z.string().max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("properties")
    .update(parsed.data)
    .eq("id", id)
    .select("id, slug, name, name_ar, city, address, bedrooms, max_guests, wifi_ssid")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const supabase = createServiceClient();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
