"use client";

import Link from "next/link";

export type CardVariant = "primary" | "secondary" | "tile" | "cta";

interface Props {
  href: string;
  eyebrow?: string;
  children: React.ReactNode;
  /** Layout variant. Default = "primary" (full-width dark). */
  variant?: CardVariant;
  locked?: boolean;
  lockedLabel?: string;
  icon?: React.ReactNode;
  description?: string;
  watermark?: React.ReactNode;
}

export function PhaseCard({
  href,
  eyebrow,
  children,
  variant = "primary",
  locked,
  lockedLabel,
  icon,
  description,
  watermark,
}: Props) {

  /* ── Primary: full-width dark hero card ─────────────────────────────── */
  if (variant === "primary") {
    return (
      <Link
        href={href}
        className="jood-card"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#351E1C",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(24px, 4vw, 40px)",
          textDecoration: "none",
          opacity: locked ? 0.5 : 1,
          pointerEvents: locked ? "none" : undefined,
          position: "relative",
          overflow: "hidden",
          minHeight: "clamp(150px, 30vw, 190px)",
          boxShadow: "0 8px 32px rgba(53,30,28,0.18), 0 2px 6px rgba(53,30,28,0.10)",
        }}
      >
        {watermark && (
          <div aria-hidden style={{ position: "absolute", right: "-10px", bottom: "-14px", opacity: 0.06, color: "#F5F4ED", pointerEvents: "none" }}>
            {watermark}
          </div>
        )}
        <div>
          {eyebrow && (
            <p className="label-eyebrow" style={{ color: "var(--jood-aqua)", marginBottom: "12px" }}>
              {locked && lockedLabel ? lockedLabel : eyebrow}
            </p>
          )}
          <div style={{ color: "#F5F4ED" }}>{children}</div>
        </div>
        <div style={{
          marginTop: "16px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "rgba(245,244,237,0.30)",
          fontSize: "0.6875rem",
          fontFamily: "var(--font-label)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}>
          <span>Open</span>
          <span style={{ fontSize: "0.8125rem" }}>→</span>
        </div>
      </Link>
    );
  }

  /* ── Secondary: full-width light featured card ──────────────────────── */
  if (variant === "secondary") {
    return (
      <Link
        href={href}
        className="jood-card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          backgroundColor: "var(--jood-surface)",
          borderRadius: "var(--radius-lg)",
          padding: "18px 20px",
          textDecoration: "none",
          boxShadow: "var(--shadow-tile)",
        }}
      >
        {icon && (
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            backgroundColor: "var(--jood-ground)",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--jood-accent)",
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "1rem", lineHeight: 1.25 }}>
            {children}
          </div>
          {description && (
            <p style={{
              color: "var(--jood-ink-muted)",
              fontSize: "0.8125rem",
              marginTop: "3px",
              fontFamily: "var(--font-body)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {description}
            </p>
          )}
        </div>
        <span style={{ color: "var(--jood-ink-faint)", fontSize: "1.125rem", flexShrink: 0 }}>→</span>
      </Link>
    );
  }

  /* ── Tile: 2-col grid card, vertical layout ─────────────────────────── */
  if (variant === "tile") {
    return (
      <Link
        href={href}
        className="jood-card"
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--jood-surface)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 16px 18px",
          textDecoration: "none",
          boxShadow: "var(--shadow-card)",
          minHeight: "120px",
          height: "100%",
        }}
      >
        {icon && (
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "11px",
            backgroundColor: "var(--jood-ground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--jood-accent)",
            marginBottom: "14px",
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(53,30,28,0.07)",
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem", lineHeight: 1.25 }}>
            {children}
          </div>
          {description && (
            <p style={{
              color: "var(--jood-ink-muted)",
              fontSize: "0.725rem",
              marginTop: "4px",
              fontFamily: "var(--font-body)",
              lineHeight: 1.4,
            }}>
              {description}
            </p>
          )}
        </div>
      </Link>
    );
  }

  /* ── CTA: slim full-width strip ─────────────────────────────────────── */
  return (
    <Link
      href={href}
      className="jood-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: "transparent",
        border: "1px solid var(--jood-line)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 18px",
        textDecoration: "none",
      }}
    >
      {icon && (
        <div style={{
          width: "34px",
          height: "34px",
          borderRadius: "10px",
          backgroundColor: "var(--jood-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "var(--jood-ink-muted)",
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ color: "var(--jood-ink-muted)", fontWeight: 500, fontSize: "0.875rem" }}>
          {children}
        </div>
        {description && (
          <p style={{ color: "var(--jood-ink-ghost)", fontSize: "0.75rem", marginTop: "2px" }}>
            {description}
          </p>
        )}
      </div>
      <span style={{ color: "var(--jood-ink-ghost)", fontSize: "0.875rem", flexShrink: 0 }}>→</span>
    </Link>
  );
}
