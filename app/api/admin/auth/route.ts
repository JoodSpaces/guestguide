import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPassword, signAdminCookie, storeSessionJti, revokeSession, requireSession, ROLE_HOME, type AdminSession } from "@/lib/admin-auth";

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
  const jti = crypto.randomUUID();

  // ── Try team_members table ──
  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("id, name, role, password_hash, property_ids")
    .eq("is_active", true)
    .ilike("name", name.trim())
    .single<{ id: string; name: string; role: "admin" | "ops" | "housekeeping" | "maintenance" | "concierge"; password_hash: string; property_ids: string[] | null }>();

  if (member && (await verifyPassword(password, member.password_hash))) {
    // Only embed JTI when Redis stored it — if Redis is unavailable the session
    // runs without revocation tracking rather than blocking login or causing a
    // fail-closed reject loop on every subsequent request.
    const stored = await storeSessionJti(jti, 7 * 24 * 60 * 60);
    const session: AdminSession = {
      id: member.id,
      name: member.name,
      role: member.role,
      ...(stored ? { jti } : {}),
      iat,
      exp,
      propertyIds: member.property_ids ?? null,
    };
    const token = await signAdminCookie(session);
    const res = NextResponse.json({ ok: true, role: member.role, redirect: ROLE_HOME[member.role] });
    setCookie(res, token);
    return res;
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession(req);
  if (session?.jti) await revokeSession(session.jti);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("jood_admin");
  return res;
}
