import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminCookie } from "@/lib/admin-auth";

async function requireAdmin(req: NextRequest) {
  const cookie = req.cookies.get("jood_admin")?.value;
  if (!cookie) return null;
  const session = await verifyAdminCookie(cookie);
  return session?.role === "admin" ? session : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid form data" }, { status: 400 });

  const file = form.get("file") as File | null;
  if (!file || file.size === 0) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "images only" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "max 10 MB" }, { status: 400 });

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${id}/hero.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createServiceClient();

  const { error: uploadError } = await supabase.storage
    .from("property-images")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from("property-images").getPublicUrl(path);
  const url = `${publicUrl}?t=${Date.now()}`;

  const { error: dbError } = await supabase
    .from("properties")
    .update({ hero_image_url: url })
    .eq("id", id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ hero_image_url: url });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const supabase = createServiceClient();
  await supabase.from("properties").update({ hero_image_url: null }).eq("id", id);

  return NextResponse.json({ ok: true });
}
