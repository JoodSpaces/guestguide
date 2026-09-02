import { NextRequest, NextResponse } from "next/server";
import { generateToken, hashToken } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { requireSession, forbidden } from "@/lib/admin-auth";

function resolveAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (configured && !configured.includes("localhost")) return configured.replace(/\/$/, "");
  // Vercel injects these at runtime — production URL is stable, VERCEL_URL is per-deploy
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;
  const vercelDeploy = process.env.VERCEL_URL;
  if (vercelDeploy) return `https://${vercelDeploy}`;
  return configured || "http://localhost:3000";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireSession(req, ["admin"]))) return forbidden();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, check_out")
    .eq("id", id)
    .single<{ id: string; check_out: string }>();

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Revoke any previously issued tokens for this booking
  await supabase
    .from("stay_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("booking_id", id)
    .is("revoked_at", null);

  const plaintext = generateToken();
  const hash = hashToken(plaintext);
  const expiresAt = new Date(new Date(booking.check_out).getTime() + 48 * 60 * 60 * 1000);

  const { error } = await supabase.from("stay_tokens").insert({
    booking_id: id,
    token_hash: hash,
    issued_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appUrl = resolveAppUrl();
  const link = `${appUrl}/s/${plaintext}`;

  const qrDataUrl = await QRCode.toDataURL(link, {
    width: 240,
    margin: 2,
    color: { dark: "#0f0e0b", light: "#f5f4ed" },
  }).catch(() => null);

  return NextResponse.json({ link, qrDataUrl });
}
