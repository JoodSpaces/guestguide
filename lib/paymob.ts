import { createHmac } from "crypto";

const BASE = "https://accept.paymob.com/api";

async function getAuthToken(): Promise<string> {
  const res = await fetch(`${BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.PAYMOB_API_KEY }),
  });
  const data = await res.json();
  if (!data.token) throw new Error("Paymob auth failed");
  return data.token as string;
}

export async function createPaymentLink({
  serviceRequestId,
  amountEgp,
  guestFirstName,
  guestLastName,
  guestEmail,
}: {
  serviceRequestId: string;
  amountEgp: number;
  guestFirstName: string;
  guestLastName: string;
  guestEmail?: string | null;
}): Promise<{ paymobOrderId: string; paymentUrl: string }> {
  const token = await getAuthToken();
  const amountCents = amountEgp * 100;

  const orderRes = await fetch(`${BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      merchant_order_id: serviceRequestId,
      items: [],
    }),
  });
  const orderData = await orderRes.json();
  if (!orderData.id) throw new Error("Paymob order creation failed");
  const paymobOrderId = String(orderData.id);

  const keyRes = await fetch(`${BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: token,
      amount_cents: amountCents,
      expiration: 3600,
      order_id: paymobOrderId,
      billing_data: {
        apartment: "NA",
        email: guestEmail ?? "guest@jood.com",
        floor: "NA",
        first_name: guestFirstName,
        street: "NA",
        building: "NA",
        phone_number: "+20100000000",
        shipping_method: "NA",
        postal_code: "NA",
        city: "NA",
        country: "EG",
        last_name: guestLastName,
        state: "NA",
      },
      currency: "EGP",
      integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID ?? "0"),
      lock_order_when_paid: false,
    }),
  });
  const keyData = await keyRes.json();
  if (!keyData.token) throw new Error("Paymob payment key creation failed");

  const iframeId = process.env.PAYMOB_IFRAME_ID;
  const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${keyData.token}`;

  return { paymobOrderId, paymentUrl };
}

// Verify HMAC from Paymob transaction processed callback
export function verifyPaymobHmac(obj: Record<string, unknown>, hmac: string): boolean {
  const secret = process.env.PAYMOB_HMAC_SECRET ?? "";
  const src = obj.source_data as Record<string, unknown> ?? {};
  const order = obj.order as Record<string, unknown> ?? {};

  const fields = [
    String(obj.amount_cents ?? ""),
    String(obj.created_at ?? ""),
    String(obj.currency ?? ""),
    String(obj.error_occured ?? ""),
    String(obj.has_parent_transaction ?? ""),
    String(obj.id ?? ""),
    String(obj.integration_id ?? ""),
    String(obj.is_3d_secure ?? ""),
    String(obj.is_auth ?? ""),
    String(obj.is_capture ?? ""),
    String(obj.is_refunded ?? ""),
    String(obj.is_standalone_payment ?? ""),
    String(obj.is_voided ?? ""),
    String(order.id ?? ""),
    String(obj.owner ?? ""),
    String(obj.pending ?? ""),
    String(src.pan ?? ""),
    String(src.sub_type ?? ""),
    String(src.type ?? ""),
    String(obj.success ?? ""),
  ];

  const computed = createHmac("sha512", secret).update(fields.join("")).digest("hex");
  return computed === hmac;
}
