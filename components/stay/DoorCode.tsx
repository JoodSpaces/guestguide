"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";

interface Props {
  token: string;
  requiresSecondFactor: boolean;
}

type State =
  | { kind: "hidden" }
  | { kind: "holding"; progress: number }
  | { kind: "second_factor"; input: string; error?: string }
  | { kind: "loading" }
  | { kind: "revealed"; code: string; copied: boolean }
  | { kind: "error"; message: string };

const HOLD_DURATION = 1500;
const RING_SIZE = 72;
const RING_R = 30;
const RING_CIRC = 2 * Math.PI * RING_R;

function ProgressRing({ progress }: { progress: number }) {
  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        stroke="rgba(245,244,237,0.15)"
        strokeWidth={2.5}
        fill="none"
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        stroke="var(--jood-accent)"
        strokeWidth={2.5}
        fill="none"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={RING_CIRC * (1 - progress)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 40ms linear" }}
      />
    </svg>
  );
}

export function DoorCode({ token, requiresSecondFactor }: Props) {
  const t = useTranslations("arrival");
  const [state, setState] = useState<State>({ kind: "hidden" });
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const holdingRef = useRef(false);

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

  const cancelHold = useCallback(() => {
    holdingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setState({ kind: "hidden" });
  }, []);

  const startHold = useCallback(() => {
    if (state.kind !== "hidden") return;
    holdingRef.current = true;
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (!holdingRef.current) return;
      const progress = Math.min(1, (now - startRef.current) / HOLD_DURATION);
      setState({ kind: "holding", progress });

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        holdingRef.current = false;
        if (requiresSecondFactor) {
          setState({ kind: "second_factor", input: "" });
        } else {
          fetchCode();
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [state.kind, requiresSecondFactor, fetchCode]);

  const copyCode = useCallback(async (code: string) => {
    await navigator.clipboard.writeText(code);
    navigator.vibrate?.(30);
    setState({ kind: "revealed", code, copied: true });
    setTimeout(() => setState({ kind: "revealed", code, copied: false }), 2000);
  }, []);

  // ── Revealed ──────────────────────────────────────────────
  if (state.kind === "revealed") {
    return (
      <div
        style={{
          backgroundColor: "var(--jood-ink)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(28px, 5vw, 48px)",
        }}
      >
        <p className="label-eyebrow" style={{ color: "rgba(245,244,237,.4)", marginBottom: "16px" }}>
          {t("door_code_label")}
        </p>
        <button
          onClick={() => copyCode(state.code)}
          aria-label={t("tap_to_copy")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", textAlign: "start" }}
        >
          <p className="code-display animate-reveal" style={{ color: "var(--jood-ground)", display: "block" }}>
            {state.code}
          </p>
          <p
            style={{
              marginTop: "12px",
              fontSize: "0.8125rem",
              fontFamily: "var(--font-label)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              transition: "color 200ms var(--ease-standard)",
              color: state.copied ? "var(--jood-accent)" : "rgba(245,244,237,.4)",
            }}
          >
            {state.copied
              ? <span className="copy-pop">{t("copied")} ✓</span>
              : t("tap_to_copy")}
          </p>
        </button>
      </div>
    );
  }

  // ── Second factor ─────────────────────────────────────────
  if (state.kind === "second_factor") {
    return (
      <div
        style={{
          backgroundColor: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(24px, 4vw, 36px)",
        }}
      >
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
          <p style={{ color: "var(--jood-danger)", fontSize: "0.875rem", marginBottom: "16px" }}>
            {state.error}
          </p>
        )}
        <button
          onClick={() => fetchCode(state.input)}
          disabled={state.input.length !== 4}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: state.input.length === 4 ? "var(--jood-ink)" : "var(--jood-line)",
            color: state.input.length === 4 ? "var(--jood-ground)" : "var(--jood-ink-muted)",
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
      <div
        style={{
          backgroundColor: "var(--jood-surface)",
          border: "1px solid var(--jood-line)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(24px, 4vw, 36px)",
        }}
      >
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
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--jood-ink)",
              color: "var(--jood-ground)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
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
      <div
        style={{
          backgroundColor: "var(--jood-ink)",
          borderRadius: "var(--radius-lg)",
          padding: "clamp(28px, 5vw, 48px)",
          minHeight: "140px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <p style={{ color: "rgba(245,244,237,.4)", fontFamily: "var(--font-label)", letterSpacing: "0.14em", textTransform: "uppercase", fontSize: "0.75rem" }}>
          {t("door_code_label")}…
        </p>
      </div>
    );
  }

  // ── Hidden / Holding ─────────────────────────────────────
  const isHolding = state.kind === "holding";
  const progress = isHolding ? state.progress : 0;

  return (
    <button
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      style={{
        width: "100%",
        backgroundColor: "var(--jood-ink)",
        borderRadius: "var(--radius-lg)",
        padding: "clamp(28px, 5vw, 48px)",
        border: "none",
        cursor: "pointer",
        textAlign: "start",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      <p className="label-eyebrow" style={{ color: "rgba(245,244,237,.4)" }}>
        {t("door_code_label")}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {isHolding ? (
            <ProgressRing progress={progress} />
          ) : (
            <span style={{ fontSize: "1.5rem", letterSpacing: "0.3em", color: "rgba(245,244,237,.5)" }}>
              ● ● ● ●
            </span>
          )}
          <p
            style={{
              color: isHolding ? "rgba(245,244,237,.8)" : "rgba(245,244,237,.5)",
              fontSize: "0.875rem",
              fontFamily: "var(--font-label)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              transition: "color 200ms var(--ease-standard)",
            }}
          >
            {isHolding ? t("hold_to_reveal") : t("hold_to_reveal")}
          </p>
        </div>
      </div>
    </button>
  );
}
