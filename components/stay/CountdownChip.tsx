"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Phase } from "@/lib/token";

interface Props {
  phase: Phase;
  checkIn: string;
  checkOut: string;
}

export function CountdownChip({ phase, checkIn, checkOut }: Props) {
  const t = useTranslations("home");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Tick every 30s — switch to every second when under an hour
    function tick() {
      setNow(Date.now());
    }
    const msUntilTarget =
      phase === "departure"
        ? new Date(checkOut).getTime() - Date.now()
        : new Date(checkIn).getTime() - Date.now();

    const interval = setInterval(tick, msUntilTarget < 3_600_000 ? 1_000 : 30_000);
    return () => clearInterval(interval);
  }, [phase, checkIn, checkOut]);

  const diff = (target: string): string => {
    const ms = new Date(target).getTime() - now;
    if (ms <= 0) return "";
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 1) return t("days_other", { count: days });
    if (days === 1) return t("days_one");
    if (hours > 1) return t("hours_other", { count: hours });
    if (hours === 1) return t("hours_one");
    // Under an hour — show mm:ss
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  let label = "";
  if (phase === "anticipation" || phase === "preparation") {
    const count = diff(checkIn);
    label = count ? t("checkin_opens_in", { count }) : t("checked_in");
  } else if (phase === "arrival" || phase === "settling" || phase === "living") {
    label = t("checked_in");
  } else if (phase === "departure") {
    const count = diff(checkOut);
    label = count ? t("checkout_in", { count }) : "";
  }

  if (!label) return null;

  return (
    <p className="mt-2 label-eyebrow" style={{ color: "var(--jood-aqua)", fontVariantNumeric: "tabular-nums" }}>
      {label}
    </p>
  );
}
