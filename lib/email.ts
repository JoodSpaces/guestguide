import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? "JOOD <onboarding@resend.dev>";
const ADMIN = process.env.ADMIN_EMAIL ?? "";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

function safe(fn: () => Promise<unknown>) {
  fn().catch((err) => console.error("[email]", err));
}

export function notifyAdminServiceRequest({
  guestName, propertyName, serviceName, quantity, requestId,
}: {
  guestName: string; propertyName: string; serviceName: string; quantity: number; requestId: string;
}) {
  safe(() => resend.emails.send({
    from: FROM,
    to: ADMIN,
    subject: `New service request — ${serviceName} · ${propertyName}`,
    text: [
      `${guestName} requested ${quantity}× ${serviceName} at ${propertyName}.`,
      "",
      APP_URL ? `Review: ${APP_URL}/admin/requests/service/${requestId}` : `Request ID: ${requestId}`,
    ].join("\n"),
  }));
}

export function notifyAdminGuestRequest({
  guestName, propertyName, category, body, urgency, requestId,
}: {
  guestName: string; propertyName: string; category: string; body: string; urgency: string; requestId: string;
}) {
  safe(() => resend.emails.send({
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
  }));
}

export function confirmGuestServiceRequest({
  guestEmail, guestFirstName, serviceName, quantity,
}: {
  guestEmail: string; guestFirstName: string; serviceName: string; quantity: number;
}) {
  safe(() => resend.emails.send({
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
  }));
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
  safe(() => resend.emails.send({
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
  }));
}
