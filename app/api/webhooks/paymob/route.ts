import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyPaymobHmac, toCents } from "@/lib/paymob";

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
    .select("id, quantity, status, paymob_order_id, services(price_egp)")
    .eq("id", merchantOrderId)
    .eq("status", "approved")
    .single<{ id: string; quantity: number; status: string; paymob_order_id: string | null; services: { price_egp: number } | null }>();

  if (!sr) return NextResponse.json({ ok: true });

  // A payment is only ever "paid" for exactly what we asked for: the Paymob order
  // we created for this request, in EGP, for the expected amount. An unknown or
  // zero price is never accepted — there is nothing to compare the payment to.
  const expectedCents = toCents((sr.services?.price_egp ?? 0) * sr.quantity);
  const receivedCents = Math.round(Number(obj.amount_cents ?? 0));
  const paidOrderId = String(order?.id ?? "");

  if (expectedCents <= 0 || receivedCents !== expectedCents || obj.currency !== "EGP") {
    console.error(`Paymob amount/currency mismatch for ${merchantOrderId}: expected ${expectedCents} EGP, got ${receivedCents} ${String(obj.currency)}`);
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }
  if (sr.paymob_order_id && sr.paymob_order_id !== paidOrderId) {
    console.error(`Paymob order mismatch for ${merchantOrderId}: expected ${sr.paymob_order_id}, got ${paidOrderId}`);
    return NextResponse.json({ error: "order_mismatch" }, { status: 400 });
  }

  await supabase
    .from("service_requests")
    .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", merchantOrderId)
    .eq("status", "approved");

  return NextResponse.json({ ok: true });
}
