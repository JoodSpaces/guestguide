import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { getBookingFromToken } from "@/lib/guest-auth";

const schema = z.object({
  token: z.string(),
  occasion: z.enum(["leisure", "business", "honeymoon", "birthday", "anniversary", "family", "other"]).nullish(),
  tempPref: z.enum(["cool", "warm", "any"]).nullish(),
  notes: z.string().max(500).nullish(),
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const booking = await getBookingFromToken(token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("arrival_preferences")
    .select("occasion, temp_pref, notes, submitted_at")
    .eq("booking_id", booking.id)
    .maybeSingle();

  return NextResponse.json({ preferences: data ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_error" }, { status: 400 });

  const booking = await getBookingFromToken(parsed.data.token);
  if (!booking) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("arrival_preferences")
    .upsert({
      booking_id: booking.id,
      occasion: parsed.data.occasion ?? null,
      temp_pref: parsed.data.tempPref ?? null,
      notes: parsed.data.notes ?? null,
      submitted_at: new Date().toISOString(),
    }, { onConflict: "booking_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
