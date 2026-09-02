import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.FROM_EMAIL ?? "JOOD <onboarding@resend.dev>";
const ADMIN = process.env.ADMIN_EMAIL ?? "";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

function safe(fn: (r: Resend) => Promise<unknown>, context?: string) {
  const r = getResend();
  if (!r) return;
  fn(r).catch((err: unknown) => {
    const e = err as { statusCode?: number; message?: string };
    console.error("[email] send failed", {
      context,
      statusCode: e.statusCode,
      message: e.message,
    });
  });
}

export function notifyAdminServiceRequest({
  guestName, propertyName, serviceName, quantity, requestId,
}: {
  guestName: string; propertyName: string; serviceName: string; quantity: number; requestId: string;
}) {
  safe((r) => r.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `New service request — ${serviceName} · ${propertyName}`,
    text: [
      `${guestName} requested ${quantity}× ${serviceName} at ${propertyName}.`,
      "",
      APP_URL ? `Review: ${APP_URL}/admin/requests/service/${requestId}` : `Request ID: ${requestId}`,
    ].join("\n"),
  }), "notifyAdminServiceRequest");
}

export function notifyAdminGuestRequest({
  guestName, propertyName, category, body, urgency, requestId,
}: {
  guestName: string; propertyName: string; category: string; body: string; urgency: string; requestId: string;
}) {
  safe((r) => r.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `${urgency === "urgent" ? "🚨 Urgent" : "New"} guest request — ${propertyName}`,
    text: [
      `${guestName} submitted a ${urgency} ${category} request at ${propertyName}.`,
      "",
      body,
      "",
      APP_URL ? `Review: ${APP_URL}/admin/requests/guest/${requestId}` : `Request ID: ${requestId}`,
    ].join("\n"),
  }), "notifyAdminGuestRequest");
}

export function confirmGuestServiceRequest({
  guestEmail, guestFirstName, serviceName, quantity,
}: {
  guestEmail: string; guestFirstName: string; serviceName: string; quantity: number;
}) {
  safe((r) => r.emails.send({
    from: FROM,
    to: guestEmail,
    subject: `We received your request — ${serviceName}`,
    text: [
      `Hi ${guestFirstName},`,
      "",
      `We've received your request for ${quantity > 1 ? `${quantity}× ` : ""}${serviceName}. Our team will review it and get back to you shortly.`,
      "",
      "— The JOOD team",
    ].join("\n"),
  }), "confirmGuestServiceRequest");
}

export function confirmGuestRequest({
  guestEmail, guestFirstName, category,
}: {
  guestEmail: string; guestFirstName: string; category: string;
}) {
  const label: Record<string, string> = {
    maintenance: "maintenance", housekeeping: "housekeeping",
    supplies: "supplies request", service: "service booking", other: "request",
  };
  safe((r) => r.emails.send({
    from: FROM,
    to: guestEmail,
    subject: "We received your request",
    text: [
      `Hi ${guestFirstName},`,
      "",
      `We've received your ${label[category] ?? "request"}. Our team will attend to it as soon as possible.`,
      "",
      "— The JOOD team",
    ].join("\n"),
  }), "confirmGuestRequest");
}
