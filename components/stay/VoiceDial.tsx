"use client";

import { Mic } from "lucide-react";

type DialState = "idle" | "connecting" | "listening" | "speaking";

/**
 * The voice concierge's face: a ring of dots around one white button. The dots light up with the sound (the guest's
 * voice or the concierge's), sweep while connecting and twinkle a little when idle. Plain SVG; no motion for people
 * who ask for less.
 */
export function VoiceDial({ state, amp, label, onClick, size = 290 }: { state: DialState; amp: number; label: string; onClick?: () => void; size?: number }) {
  const N = 72;
  const R = size / 2 - 14;
  const lit = state === "connecting" ? 12 : state === "idle" ? 0 : Math.max(2, Math.round(amp * N));
  const spin = state !== "idle";
  return (
    <div className="vdial" style={{ width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={R - 26} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
        <circle cx={size / 2} cy={size / 2} r={R - 58} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
        <g className={`vdial-ring${spin ? " spin" : ""}`}>
          {Array.from({ length: N }).map((_, i) => {
            const a = (i / N) * Math.PI * 2 - Math.PI / 2;
            // Sound lights the dots from the top, round both ways, so it reads as a level, not a hand on a clock.
            const d = Math.min(i, N - i);
            const on = state === "connecting" ? i < lit : d < lit / 2;
            const idleTwinkle = state === "idle" && i % 6 === 0;
            return (
              <circle
                key={i}
                cx={size / 2 + R * Math.cos(a)}
                cy={size / 2 + R * Math.sin(a)}
                r={on ? 3.4 : 2.6}
                fill={on || idleTwinkle ? "#FFFFFF" : "rgba(255,255,255,.22)"}
                style={{ transition: "r .12s, fill .12s" }}
              />
            );
          })}
        </g>
      </svg>
      <button type="button" className="vdial-core" onClick={onClick} disabled={!onClick} aria-label={label}>
        <Mic size={34} strokeWidth={1.8} />
      </button>
    </div>
  );
}
