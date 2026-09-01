"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";

interface Props {
  token: string;
  requiresSecondFactor: boolean;
}

type State =
  | { kind: "hidden" }
  | { kind: "dragging"; x: number; progress: number; snapping: boolean }
  | { kind: "second_factor"; input: string; error?: string }
  | { kind: "loading" }
  | { kind: "revealed"; code: string; copied: boolean }
  | { kind: "error"; message: string };

const KNOB_SIZE = 56;
const THRESHOLD = 0.82;

export function DoorCode({ token, requiresSecondFactor }: Props) {
  const t = useTranslations("arrival");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const [state, setState] = useState<State>({ kind: "hidden" });
  const trackRef = useRef<HTMLDivElement>(null);
  const trackW = useRef(280);
  const dragging = useRef(false);
  const startClientX = useRef(0);

  const fetchCode = useCallback(async (secondFactor?: string) => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/stay/reveal-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, secondFactor }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "second_factor_invalid") {
          setState({ kind: "second_factor", input: secondFactor ?? "", error: t("second_factor_error") });
        } else {
          setState({ kind: "error", message: data.error });
        }
        return;
      }
      navigator.vibrate?.(50);
      setState({ kind: "revealed", code: data.code, copied: false });
    } catch {
      setState({ kind: "error", message: "generic" });
    }
  }, [token, t]);

  const travel = () => trackW.current - KNOB_SIZE - 8;

  const settle = useCallback((x: number, tw: number) => {
    const max = tw - KNOB_SIZE - 8;
    const progress = Math.max(0, Math.min(1, x / max));
    if (progress >= THRESHOLD) {
      setState({ kind: "dragging", x: max, progress: 1, snapping: true });
      setTimeout(() => {
        if (requiresSecondFactor) setState({ kind: "second_factor", input: "" });
        else fetchCode();
      }, 320);
    } else {
      setState({ kind: "dragging", x: 0, progress: 0, snapping: true });
      setTimeout(() => setState({ kind: "hidden" }), 350);
    }
  }, [requiresSecondFactor, fetchCode]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (state.kind !== "hidden") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    trackW.current = trackRef.current?.offsetWidth ?? 280;
    startClientX.current = e.clientX;
    setState({ kind: "dragging", x: 0, progress: 0, snapping: false });
  }, [state.kind]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = isRtl
      ? startClientX.current - e.clientX
      : e.clientX - startClientX.current;
    const max = trackW.current - KNOB_SIZE - 8;
    const raw = Math.max(0, Math.min(max, delta));
    const progress = Math.max(0, Math.min(1, raw / max));
    setState({ kind: "dragging", x: raw, progress, snapping: false });
  }, [isRtl]);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setState((prev) => {
      if (prev.kind !== "dragging") return prev;
      settle(prev.x, trackW.current);
      return prev;
    });
  }, [settle]);

  const copyCode = useCallback(async (code: string) => {
    await navigator.clipboard.writeText(code);
    navigator.vibrate?.(30);
    setState({ kind: "revealed", code, copied: true });
    setTimeout(() => setState({ kind: "revealed", code, copied: false }), 2000);
  }, []);

  // ── Revealed ──────────────────────────────────────────────
  if (state.kind === "revealed") {
    return (
      <div style={{ backgroundColor: "#351E1C", borderRadius: "var(--radius-lg)", padding: "clamp(28px, 5vw, 48px)" }}>
        <p className="label-eyebrow" style={{ color: "rgba(245,244,237,.4)", marginBottom: "16px" }}>
          {t("door_code_label")}
        </p>
        <button
          onClick={() => copyCode(state.code)}
          aria-label={t("tap_to_copy")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", textAlign: "start" }}
        >
          <p className="code-display animate-reveal" style={{ color: "#F5F4ED", display: "block" }}>
            {state.code}
          </p>
          <p style={{
            marginTop: "12px",
            fontSize: "0.8125rem",
            fontFamily: "var(--font-label)",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            transition: "color 200ms var(--ease-standard)",
            color: state.copied ? "var(--jood-accent)" : "rgba(245,244,237,.4)",
          }}>
            {state.copied ? <span className="copy-pop">{t("copied")} ✓</span> : t("tap_to_copy")}
          </p>
        </button>
      </div>
    );
  }

  // ── Second factor ─────────────────────────────────────────
  if (state.kind === "second_factor") {
    return (
      <div style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "clamp(24px, 4vw, 36px)" }}>
        <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "12px" }}>
          {t("door_code_label")}
        </p>
        <p style={{ marginBottom: "20px", color: "var(--jood-ink)" }}>
          Enter the last 4 digits of your phone number to reveal the code
        </p>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={state.input}
          onChange={(e) => setState({ kind: "second_factor", input: e.target.value })}
          placeholder="_ _ _ _"
          style={{
            width: "100%",
            fontFamily: "var(--font-mono)",
            fontSize: "1.5rem",
            letterSpacing: "0.4em",
            padding: "12px 16px",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--jood-ground)",
            color: "var(--jood-ink)",
            marginBottom: state.error ? "8px" : "16px",
          }}
        />
        {state.error && (
          <p style={{ color: "var(--jood-danger)", fontSize: "0.875rem", marginBottom: "16px" }}>{state.error}</p>
        )}
        <button
          onClick={() => fetchCode(state.input)}
          disabled={state.input.length !== 4}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: state.input.length === 4 ? "#351E1C" : "var(--jood-line)",
            color: state.input.length === 4 ? "#F5F4ED" : "var(--jood-ink-muted)",
            border: "none",
            borderRadius: "var(--radius-pill)",
            cursor: state.input.length === 4 ? "pointer" : "not-allowed",
            fontSize: "0.9375rem",
            transition: "background-color 200ms var(--ease-standard)",
          }}
        >
          Reveal code
        </button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (state.kind === "error") {
    return (
      <div style={{ backgroundColor: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", padding: "clamp(24px, 4vw, 36px)" }}>
        <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "10px" }}>
          {t("door_code_label")}
        </p>
        <p style={{ color: "var(--jood-ink)", marginBottom: "16px" }}>
          {state.message === "code_not_set"
            ? "Door code hasn't been set yet — contact your host."
            : state.message === "arrival_locked"
            ? "Arrival details haven't unlocked yet."
            : "Couldn't load the code. Please try again."}
        </p>
        {state.message !== "code_not_set" && (
          <button
            onClick={() => setState({ kind: "hidden" })}
            style={{ padding: "10px 20px", backgroundColor: "#351E1C", color: "#F5F4ED", border: "none", borderRadius: "var(--radius-pill)", cursor: "pointer", fontSize: "0.875rem" }}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────
  if (state.kind === "loading") {
    return (
      <div style={{ backgroundColor: "#351E1C", borderRadius: "var(--radius-lg)", padding: "clamp(28px, 5vw, 48px)", minHeight: "140px", display: "flex", alignItems: "center" }}>
        <p style={{ color: "rgba(245,244,237,.4)", fontFamily: "var(--font-label)", letterSpacing: "0.14em", textTransform: "uppercase", fontSize: "0.75rem" }}>
          {t("door_code_label")}…
        </p>
      </div>
    );
  }

  // ── Hidden / Dragging ─────────────────────────────────────
  const isDragging = state.kind === "dragging";
  const knobPos = isDragging ? state.x : 0;
  const isSnapping = isDragging && state.snapping;
  const progress = isDragging ? state.progress : 0;

  return (
    <div
      style={{
        backgroundColor: "#351E1C",
        borderRadius: "var(--radius-lg)",
        padding: "clamp(22px, 4vw, 36px)",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      <p className="label-eyebrow" style={{ color: "rgba(245,244,237,.4)", marginBottom: "20px" }}>
        {t("door_code_label")}
      </p>

      {/* Instruction text */}
      <p style={{
        fontFamily: "var(--font-body)",
        fontSize: "0.9375rem",
        color: `rgba(245,244,237,${0.28 + progress * 0.32})`,
        marginBottom: "20px",
        transition: isDragging && !isSnapping ? "none" : "color 300ms",
      }}>
        {isRtl ? "اسحب لعرض الرمز" : "Slide to reveal your code"}
      </p>

      {/* Slider track */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: "relative",
          height: `${KNOB_SIZE}px`,
          borderRadius: `${KNOB_SIZE / 2}px`,
          backgroundColor: "rgba(245,244,237,0.08)",
          border: "1px solid rgba(245,244,237,0.12)",
          cursor: "grab",
          overflow: "hidden",
        }}
      >
        {/* Fill bar */}
        <div style={{
          position: "absolute",
          insetBlock: 0,
          insetInlineStart: 0,
          width: `${knobPos + KNOB_SIZE}px`,
          background: `linear-gradient(90deg, rgba(255,96,55,${0.12 + progress * 0.25}), rgba(255,96,55,${0.06 + progress * 0.15}))`,
          transition: isSnapping ? `width 320ms cubic-bezier(0.16,1,0.3,1)` : "none",
          borderRadius: "inherit",
        }} />

        {/* Lock dots */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          opacity: Math.max(0, 1 - progress * 3),
          pointerEvents: "none",
        }}>
          {["●","●","●","●"].map((d, i) => (
            <span key={i} style={{ fontSize: "10px", color: "rgba(245,244,237,0.3)", letterSpacing: "0.1em" }}>{d}</span>
          ))}
        </div>

        {/* Knob */}
        <div style={{
          position: "absolute",
          top: "4px",
          bottom: "4px",
          width: `${KNOB_SIZE - 8}px`,
          [isRtl ? "right" : "left"]: `${knobPos + 4}px`,
          borderRadius: `${(KNOB_SIZE - 8) / 2}px`,
          backgroundColor: progress >= THRESHOLD ? "var(--jood-accent)" : "#F5F4ED",
          boxShadow: progress >= THRESHOLD
            ? "0 0 0 4px rgba(255,96,55,0.25)"
            : "0 2px 12px rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: isSnapping
            ? `left 320ms cubic-bezier(0.16,1,0.3,1), right 320ms cubic-bezier(0.16,1,0.3,1), background-color 180ms ease`
            : "background-color 180ms ease",
          cursor: "grab",
        }}>
          <svg
            width="18" height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={progress >= THRESHOLD ? "white" : "#351E1C"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: isRtl ? "scaleX(-1)" : "none", transition: "stroke 180ms ease" }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
