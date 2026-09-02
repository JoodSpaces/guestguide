"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div
      style={{
        padding: "48px 24px",
        maxWidth: "480px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "rgba(155,34,38,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "20px",
        }}
      >
        ⚠
      </div>
      <h2
        style={{
          fontFamily: "var(--font-display, 'Instrument Serif', serif)",
          fontWeight: 400,
          fontSize: "22px",
          margin: "0 0 8px",
          color: "var(--jood-ink)",
        }}
      >
        Page failed to load
      </h2>
      <p
        style={{
          fontSize: "13.5px",
          color: "var(--jood-ink-muted)",
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        {error.digest ? (
          <>
            An error occurred (ref: <code style={{ fontSize: "12px" }}>{error.digest}</code>
            ). Check Sentry for details.
          </>
        ) : (
          "An unexpected error occurred. Try refreshing or returning to the previous screen."
        )}
      </p>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            background: "var(--jood-garnet)",
            border: "none",
            color: "#F5F4ED",
            padding: "9px 22px",
            borderRadius: "8px",
            fontSize: "13.5px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Retry
        </button>
        <button
          onClick={() => (window.location.href = "/admin")}
          style={{
            background: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            color: "var(--jood-ink)",
            padding: "9px 22px",
            borderRadius: "8px",
            fontSize: "13.5px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Dashboard
        </button>
      </div>
    </div>
  );
}
