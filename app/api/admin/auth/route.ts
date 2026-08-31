import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPassword, signAdminCookie, ROLE_HOME, type AdminSession } from "@/lib/admin-auth";

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  let diff = aBuf.length ^ bBuf.length;
  const len = Math.max(aBuf.length, bBuf.length);
  for (let i = 0; i < len; i++) diff |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0);
  return diff === 0;
}

function setCookie(res: NextResponse, token: string) {
  res.cookies.set("jood_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, password } = body as { name?: string; password?: string };
  if (!name || !password) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const iat = Date.now();
  const exp = iat + 7 * 24 * 60 * 60 * 1000;

  // ── Try team_members table ──
  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("id, name, role, password_hash")
    .eq("is_active", true)
    .ilike("name", name.trim())
    .single<{ id: string; name: string; role: "admin" | "ops" | "housekeeping" | "maintenance" | "concierge"; password_hash: string }>();

  if (member && (await verifyPassword(password, member.password_hash))) {
    const session: AdminSession = { id: member.id, name: member.name, role: member.role, iat, exp };
    const token = await signAdminCookie(session);
    const res = NextResponse.json({ ok: true, role: member.role, redirect: ROLE_HOME[member.role] });
    setCookie(res, token);
    return res;
  }

  // ── Legacy fallback: ADMIN_PASSWORD env var as "admin" ──
  const legacyPassword = process.env.ADMIN_PASSWORD ?? "";
  if (legacyPassword && timingSafeEqual(password, legacyPassword) && name.toLowerCase() === "admin") {
    const session: AdminSession = { id: "legacy", name: "Admin", role: "admin", iat, exp };
    const token = await signAdminCookie(session);
    const res = NextResponse.json({ ok: true, role: "admin", redirect: "/admin" });
    setCookie(res, token);
    return res;
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("jood_admin");
  return res;
}
