import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPaymobHmac } from "@/lib/paymob";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || body.type !== "TRANSACTION") return NextResponse.json({ ok: true });

  const obj = body.obj as Record<string, unknown>;
  const hmac = req.nextUrl.searchParams.get("hmac");

  if (!hmac || !verifyPaymobHmac(obj, hmac)) {
    return NextResponse.json({ error: "invalid_hmac" }, { status: 400 });
  }

  if (!obj.success || obj.pending) return NextResponse.json({ ok: true });

  const order = obj.order as Record<string, unknown>;
  const merchantOrderId = order?.merchant_order_id as string | undefined;

  if (!merchantOrderId || !/^[0-9a-f-]{36}$/.test(merchantOrderId)) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();

  const { data: sr } = await supabase
    .from("service_requests")
    .select("id, quantity, status, services(price_egp)")
    .eq("id", merchantOrderId)
    .eq("status", "approved")
    .single<{ id: string; quantity: number; status: string; services: { price_egp: number } | null }>();

  if (!sr) return NextResponse.json({ ok: true });

  const expectedCents = (sr.services?.price_egp ?? 0) * sr.quantity * 100;
  const receivedCents = Number(obj.amount_cents ?? 0);

  if (expectedCents > 0 && receivedCents !== expectedCents) {
    console.error(`Paymob amount mismatch for ${merchantOrderId}: expected ${expectedCents}, got ${receivedCents}`);
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  await supabase
    .from("service_requests")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", merchantOrderId)
    .eq("status", "approved");

  return NextResponse.json({ ok: true });
}
