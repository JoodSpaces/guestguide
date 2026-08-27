import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { hashPassword, verifyAdminCookie } from "@/lib/admin-auth";

async function requireAdmin(req: NextRequest) {
  const cookie = req.cookies.get("jood_admin")?.value;
  if (!cookie) return null;
  const session = await verifyAdminCookie(cookie);
  return session?.role === "admin" ? session : null;
}

const patchSchema = z.object({
  role: z.enum(["admin", "ops", "concierge"]).optional(),
  password: z.string().min(6).max(200).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
  if (parsed.data.password) updates.password_hash = await hashPassword(parsed.data.password);

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  const supabase = createServiceClient();
  const { error } = await supabase.from("team_members").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
