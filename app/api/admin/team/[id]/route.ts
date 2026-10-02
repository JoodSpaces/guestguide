import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { auditAdmin } from "@/lib/audit";
import { hashPassword, requireSession, forbidden } from "@/lib/admin-auth";

const patchSchema = z.object({
  role: z.enum(["admin", "ops", "housekeeping", "maintenance", "concierge"]).optional(),
  password: z.string().min(6).max(200).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(req, ["admin"]);
  if (!session) return forbidden();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const supabase = createServiceClient();

  // Owner account cannot have its role or active status changed by anyone
  if (parsed.data.role !== undefined || parsed.data.is_active !== undefined) {
    const { data: target } = await supabase
      .from("team_members")
      .select("is_owner")
      .eq("id", id)
      .single();
    if (target?.is_owner) {
      return NextResponse.json({ error: "Cannot change the master admin's role or status." }, { status: 403 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;
  if (parsed.data.password) updates.password_hash = await hashPassword(parsed.data.password);

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase.from("team_members").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await auditAdmin(supabase, {
    actorType: "admin", actorId: session.id, action: "team.updated", entity: "team_members", entityId: id,
    meta: { role: parsed.data.role, is_active: parsed.data.is_active, password_changed: !!parsed.data.password },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession(req, ["admin"]);
  if (!session) return forbidden();

  const { id } = await params;
  const supabase = createServiceClient();

  // Owner account can never be deleted
  const { data: target } = await supabase
    .from("team_members")
    .select("is_owner")
    .eq("id", id)
    .single();
  if (target?.is_owner) {
    return NextResponse.json({ error: "The master admin account cannot be deleted." }, { status: 403 });
  }

  const { data: gone } = await supabase.from("team_members").select("name, role").eq("id", id).maybeSingle<{ name: string; role: string }>();
  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await auditAdmin(supabase, { actorType: "admin", actorId: session.id, action: "team.deleted", entity: "team_members", entityId: id, meta: { name: gone?.name, role: gone?.role } });

  return NextResponse.json({ ok: true });
}
