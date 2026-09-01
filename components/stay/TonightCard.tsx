"use client";

import { useEffect, useState } from "react";
import type { WeatherData } from "@/lib/types/weather";

interface Props {
  token: string;
  isAr: boolean;
  note: string | null;     // tonight_note from property (null = not set)
  noteAr: string | null;
}

type SunsetStatus = { kind: "loading" } | { kind: "ok"; sunset: string } | { kind: "error" };

function SunsetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 10V2" />
      <path d="M4.93 10.93l1.41 1.41" />
      <path d="M2 18h2" />
      <path d="M20 18h2" />
      <path d="M19.07 10.93l-1.41 1.41" />
      <path d="M22 22H2" />
      <path d="M16 6l-4 4-4-4" />
      <path d="M4 18a8 8 0 0116 0" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

export function TonightCard({ token, isAr, note, noteAr }: Props) {
  const [sunsetStatus, setSunsetStatus] = useState<SunsetStatus>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stay/weather?token=${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<WeatherData>;
      })
      .then((data) => {
        if (!cancelled) setSunsetStatus({ kind: "ok", sunset: data.sunsetLocal });
      })
      .catch(() => {
        if (!cancelled) setSunsetStatus({ kind: "error" });
      });
    return () => { cancelled = true; };
  }, [token]);

  const activeNote = isAr ? (noteAr || note) : (note || noteAr);
  const hasSunset = sunsetStatus.kind === "ok";

  // Don't render if there's nothing useful to show
  if (!hasSunset && !activeNote) return null;

  return (
    <div
      className="animate-reveal"
      style={{
        border: "1px solid var(--jood-line)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        marginBottom: "16px",
      }}
    >
      {/* Header bar */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid var(--jood-line)",
        backgroundColor: "var(--jood-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--jood-ink-muted)",
        }}>
          {isAr ? "الليلة" : "TONIGHT"}
        </p>
        {/* Sunset badge */}
        {hasSunset && (
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            color: "var(--jood-accent)",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            letterSpacing: "0.12em",
          }}>
            <SunsetIcon />
            {isAr ? `الغروب ${(sunsetStatus as { kind: "ok"; sunset: string }).sunset}` : `SUNSET ${(sunsetStatus as { kind: "ok"; sunset: string }).sunset}`}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px", backgroundColor: "var(--jood-ground)" }}>
        {activeNote ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ color: "var(--jood-accent)", marginTop: "2px" }}>
              <NoteIcon />
            </span>
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--jood-ink)",
              lineHeight: 1.6,
            }}>
              {activeNote}
            </p>
          </div>
        ) : (
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--jood-ink-muted)",
            fontStyle: "italic",
          }}>
            {isAr ? "استمتع بمساء جميل." : "Enjoy your evening."}
          </p>
        )}
      </div>
    </div>
  );
}
