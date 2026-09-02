import Link from "next/link";
import type { ReactNode } from "react";

interface PhaseCardProps {
  href: string;
  eyebrow?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "tile" | "cta";
  locked?: boolean;
  lockedLabel?: string;
  icon?: ReactNode;
  description?: string;
  watermark?: ReactNode;
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
}: PhaseCardProps) {

  /* ── Primary: full-width dark hero card ────────────────────────────────── */
  if (variant === "primary") {
    return (
      <Link
        href={href}
        className="jood-card"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "var(--jood-ink-deep)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(22px, 4vw, 36px)",
          textDecoration: "none",
          opacity: locked ? 0.5 : 1,
          pointerEvents: locked ? "none" : undefined,
          position: "relative",
          overflow: "hidden",
          minHeight: "clamp(148px, 30vw, 188px)",
          boxShadow: "0 6px 24px rgba(53,30,28,0.16), 0 2px 6px rgba(53,30,28,0.08)",
        }}
      >
        {/* Subtle watermark */}
        {watermark && (
          <div aria-hidden style={{
            position: "absolute", right: "-8px", bottom: "-12px",
            opacity: 0.05, color: "#F5F4ED", pointerEvents: "none",
          }}>
            {watermark}
          </div>
        )}

        {/* Content */}
        <div>
          {eyebrow && (
            <p className="label-eyebrow" style={{ color: "var(--jood-aqua)", marginBottom: "10px" }}>
              {locked && lockedLabel ? lockedLabel : eyebrow}
            </p>
          )}
          <div style={{ color: "#EDE9E0" }}>{children}</div>
        </div>

        {/* Footer CTA */}
        <div style={{
          marginTop: "14px",
          display: "flex", alignItems: "center", gap: "5px",
          color: "rgba(245,244,237,0.25)",
          fontSize: "0.6875rem",
          fontFamily: "var(--font-label)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          <span>Open</span>
          <span style={{ fontSize: "0.8125rem" }}>→</span>
        </div>
      </Link>
    );
  }

  /* ── Secondary: horizontal list card ───────────────────────────────────── */
  if (variant === "secondary") {
    return (
      <Link
        href={href}
        className="jood-card"
        style={{
          display: "flex", alignItems: "center", gap: "14px",
          backgroundColor: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 18px",
          textDecoration: "none",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {icon && (
          <div style={{
            width: "44px", height: "44px",
            borderRadius: "12px",
            backgroundColor: "var(--jood-surface-raised)",
            boxShadow: "var(--shadow-xs)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            color: "var(--jood-mid)",  /* refined: mid instead of accent */
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem", lineHeight: 1.25 }}>
            {children}
          </div>
          {description && (
            <p style={{
              color: "var(--jood-ink-muted)", fontSize: "0.8125rem",
              marginTop: "2px", fontFamily: "var(--font-body)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {description}
            </p>
          )}
        </div>
        <span style={{ color: "var(--jood-ink-faint)", fontSize: "1rem", flexShrink: 0 }}>→</span>
      </Link>
    );
  }

  /* ── Tile: 2-col grid card ──────────────────────────────────────────────── */
  if (variant === "tile") {
    return (
      <Link
        href={href}
        className="jood-card"
        style={{
          display: "flex", flexDirection: "column",
          backgroundColor: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 16px 18px",
          textDecoration: "none",
          boxShadow: "var(--shadow-card)",
          minHeight: "120px", height: "100%",
        }}
      >
        {icon && (
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            backgroundColor: "var(--jood-surface-raised)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--jood-mid)",  /* refined: mid instead of accent */
            marginBottom: "12px", flexShrink: 0,
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
              color: "var(--jood-ink-muted)", fontSize: "0.725rem",
              marginTop: "4px", fontFamily: "var(--font-body)", lineHeight: 1.4,
            }}>
              {description}
            </p>
          )}
        </div>
      </Link>
    );
  }

  /* ── CTA: slim full-width strip ─────────────────────────────────────────── */
  return (
    <Link
      href={href}
      className="jood-card"
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        backgroundColor: "transparent",
        border: "1px solid var(--jood-line)",
        borderRadius: "var(--radius-lg)",
        padding: "13px 16px",
        textDecoration: "none",
      }}
    >
      {icon && (
        <div style={{
          width: "32px", height: "32px", borderRadius: "9px",
          backgroundColor: "var(--jood-surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--jood-mid)", flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.875rem", lineHeight: 1.25 }}>
          {children}
        </div>
        {description && (
          <p style={{ color: "var(--jood-ink-muted)", fontSize: "0.75rem", marginTop: "2px" }}>
            {description}
          </p>
        )}
      </div>
      <span style={{ color: "var(--jood-ink-faint)", flexShrink: 0 }}>→</span>
    </Link>
  );
}
