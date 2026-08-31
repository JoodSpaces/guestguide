"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const t = {
  en: {
    success_title: "Payment received",
    success_body: "Thank you — your service request has been confirmed. Our team will take it from here.",
    failed_title: "Payment unsuccessful",
    insufficient_funds: "Your card had insufficient funds. Please try again with a different card.",
    failed_body: "The payment could not be processed. Please return to your stay portal and try again.",
    ref: "REF",
    return_prompt: "Return to your stay portal using the original link sent to you.",
  },
  ar: {
    success_title: "تم استلام الدفع",
    success_body: "شكراً — تم تأكيد طلب الخدمة. سيتولى فريقنا الأمر من هنا.",
    failed_title: "فشل الدفع",
    insufficient_funds: "رصيد بطاقتك غير كافٍ. يرجى المحاولة ببطاقة أخرى.",
    failed_body: "لم نتمكن من معالجة الدفع. يرجى العودة إلى بوابة إقامتك والمحاولة مجدداً.",
    ref: "المرجع",
    return_prompt: "عُد إلى بوابة إقامتك عبر الرابط الأصلي الذي أُرسل إليك.",
  },
} as const;

function ResultContent() {
  const params = useSearchParams();
  const success = params.get("success") === "true";
  const txnCode = params.get("txn_response_code");
  const orderId = params.get("merchant_order_id");
  const localeParam = params.get("locale");
  const browserAr = typeof navigator !== "undefined" && navigator.language.startsWith("ar");
  const locale = (localeParam === "ar" || (!localeParam && browserAr)) ? "ar" : "en";
  const tr = t[locale];
  const isRtl = locale === "ar";

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "var(--jood-ground)",
        textAlign: "center",
        fontFamily: isRtl ? "Almarai, sans-serif" : "inherit",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/jood-logo-dark.png" alt="JOOD" style={{ height: "24px", marginBottom: "40px", opacity: 0.6 }} />

      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: success ? "var(--jood-success)" : "var(--jood-danger)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
          fontSize: "28px",
        }}
      >
        {success ? "✓" : "✕"}
      </div>

      <h1
        className="font-display"
        style={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", marginBottom: "12px", color: "var(--jood-ink)" }}
      >
        {success ? tr.success_title : tr.failed_title}
      </h1>

      <p style={{ fontSize: "0.9375rem", color: "var(--jood-ink-muted)", maxWidth: "340px", lineHeight: 1.6, marginBottom: "32px" }}>
        {success
          ? tr.success_body
          : txnCode === "INSUFFICIENT_FUNDS"
          ? tr.insufficient_funds
          : tr.failed_body}
      </p>

      {orderId && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.14em", color: "var(--jood-ink-ghost)", marginBottom: "28px" }}>
          {tr.ref} {orderId.slice(0, 8).toUpperCase()}
        </p>
      )}

      <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
        {tr.return_prompt}
      </p>
    </main>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
