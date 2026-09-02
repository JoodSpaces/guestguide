"use client";

import { useEffect } from "react";

export default function GuestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GuestError]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--jood-ground)",
        color: "var(--jood-ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "var(--font-body, system-ui)",
      }}
    >
      {/* Frame */}
      <div
        style={{
          position: "fixed",
          inset: "12px",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg, 16px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "320px", textAlign: "center", position: "relative" }}>
        <div
          style={{
            fontFamily: "var(--font-display, 'Instrument Serif', serif)",
            fontSize: "56px",
            lineHeight: 1,
            color: "var(--jood-line)",
            marginBottom: "20px",
          }}
        >
          ∅
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Instrument Serif', serif)",
            fontWeight: 400,
            fontSize: "26px",
            margin: "0 0 10px",
            letterSpacing: "-0.01em",
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--jood-ink-muted)",
            lineHeight: 1.65,
            margin: "0 0 28px",
          }}
        >
          We&apos;re sorry for the interruption. Please try refreshing, or
          contact the front desk if the issue continues.
        </p>
        <button
          onClick={reset}
          style={{
            background: "var(--jood-garnet)",
            border: "none",
            color: "#F5F4ED",
            padding: "11px 28px",
            borderRadius: "var(--radius-pill, 20px)",
            fontSize: "14px",
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
