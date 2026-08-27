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

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("team_members")
    .select("id, name, role, is_active, created_at")
    .order("created_at");

  return NextResponse.json(data ?? []);
}

const createSchema = z.object({
  name: z.string().min(1).max(50),
  role: z.enum(["admin", "ops", "concierge"]),
  password: z.string().min(6).max(200),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error", details: parsed.error.flatten() }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.password);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("team_members")
    .insert({ name: parsed.data.name, role: parsed.data.role, password_hash: passwordHash })
    .select("id, name, role, is_active, created_at")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Name already taken" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
