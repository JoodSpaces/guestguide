"use client";

import Link from "next/link";

interface Props {
  href: string;
  eyebrow: string;
  children: React.ReactNode;
  primary?: boolean;
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
  primary,
  locked,
  lockedLabel,
  icon,
  description,
  watermark,
}: Props) {
  if (primary) {
    return (
      <Link
        href={href}
        className="jood-card"
        style={{
          display: "block",
          backgroundColor: "var(--jood-ink)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(22px, 3vw, 36px)",
          textDecoration: "none",
          opacity: locked ? 0.5 : 1,
          pointerEvents: locked ? "none" : undefined,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Watermark */}
        {watermark && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: "-12px",
              bottom: "-16px",
              opacity: 0.07,
              color: "var(--jood-ground)",
              pointerEvents: "none",
            }}
          >
            {watermark}
          </div>
        )}

        {eyebrow && (
          <p
            className="label-eyebrow mb-3"
            style={{ color: "var(--jood-aqua)" }}
          >
            {locked && lockedLabel ? lockedLabel : eyebrow}
          </p>
        )}
        <div style={{ color: "var(--jood-ground)" }}>{children}</div>

        {/* Bottom arrow */}
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "rgba(245,244,237,0.35)",
            fontSize: "0.75rem",
            fontFamily: "var(--font-label)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <span>View</span>
          <span style={{ fontSize: "0.875rem" }}>→</span>
        </div>
      </Link>
    );
  }

  /* Secondary card */
  return (
    <Link
      href={href}
      className="jood-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        backgroundColor: "var(--jood-surface)",
        border: "1px solid var(--jood-line)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 18px",
        textDecoration: "none",
        opacity: locked ? 0.5 : 1,
        pointerEvents: locked ? "none" : undefined,
      }}
    >
      {/* Icon pill */}
      {icon && (
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            backgroundColor: "var(--jood-ground)",
            border: "1px solid var(--jood-line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--jood-accent)",
          }}
        >
          {icon}
        </div>
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--jood-ink)", fontWeight: 500, fontSize: "0.9375rem" }}>
          {children}
        </div>
        {description && (
          <p
            style={{
              color: "var(--jood-ink-muted)",
              fontSize: "0.775rem",
              marginTop: "2px",
              fontFamily: "var(--font-body)",
              letterSpacing: "0",
              textTransform: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Arrow */}
      <span
        style={{
          color: "var(--jood-ink-faint)",
          fontSize: "1rem",
          flexShrink: 0,
          transition: "transform 200ms var(--ease-standard)",
        }}
      >
        →
      </span>
    </Link>
  );
}
