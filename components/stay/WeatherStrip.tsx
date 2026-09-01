"use client";

import { useEffect, useState } from "react";
import type { WeatherData } from "@/lib/types/weather";

interface Props {
  token: string;
  isAr: boolean;
}

type Status = { kind: "loading" } | { kind: "ok"; data: WeatherData } | { kind: "error" };

const STATIC_PLACES = ["North Coast", "Sidi Heneish", "Hacienda Bay", "Mediterranean", "Sahel", "Villa Life"];

function Dot() {
  return (
    <span style={{ color: "var(--jood-accent)", fontSize: "7px", lineHeight: 1, flexShrink: 0 }}>●</span>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "6px", whiteSpace: "nowrap" }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--jood-garnet)",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: "var(--jood-ink)",
        fontWeight: 600,
      }}>
        {value}
      </span>
    </span>
  );
}

export function WeatherStrip({ token, isAr }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stay/weather?token=${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<WeatherData>;
      })
      .then((data) => { if (!cancelled) setStatus({ kind: "ok", data }); })
      .catch(() => { if (!cancelled) setStatus({ kind: "error" }); });
    return () => { cancelled = true; };
  }, [token]);

  const stripStyle: React.CSSProperties = {
    overflow: "hidden",
    borderBlock: "1px solid var(--jood-line)",
    marginBottom: "24px",
    padding: "9px 0",
  };

  // Fallback: static marquee while loading or on error
  if (status.kind !== "ok") {
    return (
      <div style={stripStyle}>
        <div dir="ltr" className="jood-marquee-track" style={{ display: "inline-flex", gap: "18px", alignItems: "center", whiteSpace: "nowrap" }}>
          {[...STATIC_PLACES, ...STATIC_PLACES].flatMap((place, i) => [
            <span key={`p-${i}`} style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--jood-ink)", fontWeight: 500 }}>{place}</span>,
            <span key={`d-${i}`} style={{ color: "var(--jood-accent)", fontSize: "8px" }}>●</span>,
          ])}
        </div>
      </div>
    );
  }

  const { data } = status;
  const tempLabel = isAr ? "درجة الحرارة" : "TEMP";
  const uvLabel = "UV";
  const windLabel = isAr ? "الرياح" : "WIND";
  const sunsetLabel = isAr ? "الغروب" : "SUNSET";
  const waveLabel = isAr ? "الأمواج" : "SWELL";

  const chips: { label: string; value: string }[] = [
    { label: tempLabel, value: `${data.tempC}°C` },
    { label: uvLabel, value: String(data.uvIndex) },
    { label: windLabel, value: `${data.windKph} KM/H` },
    { label: sunsetLabel, value: data.sunsetLocal },
    ...(data.waveM !== null ? [{ label: waveLabel, value: `${data.waveM}M` }] : []),
  ];

  // Double the chips for seamless scroll
  const doubled = [...chips, ...chips];

  return (
    <div style={stripStyle}>
      <div dir="ltr" className="jood-marquee-track" style={{ display: "inline-flex", gap: "22px", alignItems: "center", whiteSpace: "nowrap" }}>
        {doubled.flatMap((chip, i) => [
          <Chip key={`c-${i}`} label={chip.label} value={chip.value} />,
          <Dot key={`d-${i}`} />,
        ])}
      </div>
    </div>
  );
}
