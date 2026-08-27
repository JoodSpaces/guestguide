import { NextRequest, NextResponse } from "next/server";
import { generateToken, hashToken } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const plaintext = generateToken();
  const hash = hashToken(plaintext);
  const expiresAt = new Date(new Date(booking.check_out).getTime() + 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("stay_tokens").insert({
    booking_id: id,
    token_hash: hash,
    issued_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({ link: `${appUrl}/s/${plaintext}` });
}
