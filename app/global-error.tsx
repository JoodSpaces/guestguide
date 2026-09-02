"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry is initialized separately; it will capture this automatically.
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          backgroundColor: "#231211",
          color: "#F3EEE6",
          fontFamily:
            "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "400px", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "72px",
              lineHeight: 1,
              color: "rgba(243,238,230,0.15)",
              marginBottom: "24px",
              letterSpacing: "-0.02em",
            }}
          >
            !
          </div>
          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontWeight: 400,
              fontSize: "28px",
              margin: "0 0 12px",
              letterSpacing: "-0.01em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(243,238,230,0.55)",
              lineHeight: 1.6,
              margin: "0 0 32px",
            }}
          >
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{
              background: "rgba(243,238,230,0.12)",
              border: "1px solid rgba(243,238,230,0.18)",
              color: "#F3EEE6",
              padding: "10px 24px",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.02em",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
