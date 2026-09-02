import Link from "next/link";

export default function NotFound() {
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
      {/* Editorial frame */}
      <div
        style={{
          position: "fixed",
          inset: "12px",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg, 16px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ textAlign: "center", position: "relative" }}>
        <div
          style={{
            fontFamily: "var(--font-display, 'Instrument Serif', serif)",
            fontSize: "clamp(80px, 18vw, 160px)",
            lineHeight: 1,
            color: "var(--jood-line)",
            letterSpacing: "-0.04em",
            marginBottom: "4px",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Instrument Serif', serif)",
            fontWeight: 400,
            fontSize: "clamp(22px, 4vw, 30px)",
            margin: "0 0 12px",
            letterSpacing: "-0.01em",
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--jood-ink-muted)",
            lineHeight: 1.65,
            margin: "0 auto 32px",
            maxWidth: "300px",
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has moved.
          If you have a stay link, please use that to access your stay.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "var(--jood-garnet)",
            color: "#F5F4ED",
            padding: "11px 28px",
            borderRadius: "var(--radius-pill, 20px)",
            fontSize: "14px",
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
