"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ResultContent() {
  const params = useSearchParams();
  const success = params.get("success") === "true";
  const txnCode = params.get("txn_response_code");
  const orderId = params.get("merchant_order_id");

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "var(--jood-ground)",
        textAlign: "center",
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
        {success ? "Payment received" : "Payment unsuccessful"}
      </h1>

      <p style={{ fontSize: "0.9375rem", color: "var(--jood-ink-muted)", maxWidth: "340px", lineHeight: 1.6, marginBottom: "32px" }}>
        {success
          ? "Thank you — your service request has been confirmed. Our team will take it from here."
          : txnCode === "INSUFFICIENT_FUNDS"
          ? "Your card had insufficient funds. Please try again with a different card."
          : "The payment could not be processed. Please return to your stay portal and try again."}
      </p>

      {orderId && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.14em", color: "var(--jood-ink-ghost)", marginBottom: "28px" }}>
          REF {orderId.slice(0, 8).toUpperCase()}
        </p>
      )}

      <p style={{ fontSize: "0.8125rem", color: "var(--jood-ink-muted)" }}>
        Return to your stay portal using the original link sent to you.
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
