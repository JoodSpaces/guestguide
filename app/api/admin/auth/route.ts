import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const SECRET = process.env.ADMIN_SECRET ?? "";

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(sig).toString("base64url");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (!body.password || body.password !== PASSWORD || !SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const iat = Date.now();
  const exp = iat + 7 * 24 * 60 * 60 * 1000;
  const payload = `${iat}.${exp}`;
  const sig = await sign(payload);
  const token = `${payload}.${sig}`;

  const res = NextResponse.json({ ok: true });
  res.cookies.set("jood_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("jood_admin");
  return res;
}
