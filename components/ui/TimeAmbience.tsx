"use client";

import { useState, useEffect } from "react";

function ambienceForHour(h: number): React.CSSProperties {
  // Dawn 5–8: warm gold flooding from top
  if (h >= 5 && h < 9) return {
    backgroundImage: [
      "radial-gradient(ellipse 120% 55% at 50% 0%, rgba(255,195,80,0.14) 0%, transparent 65%)",
      "radial-gradient(ellipse 70% 35% at 80% 0%, rgba(255,140,60,0.08) 0%, transparent 55%)",
    ].join(", "),
  };

  // Morning 9–11: bright neutral, almost no tint
  if (h >= 9 && h < 11) return {
    backgroundImage: "radial-gradient(ellipse 90% 40% at 50% 0%, rgba(230,220,200,0.06) 0%, transparent 60%)",
  };

  // Midday 11–15: clean, no overlay
  if (h >= 11 && h < 15) return {};

  // Late afternoon 15–16: subtle warmth building
  if (h >= 15 && h < 16) return {
    backgroundImage: "radial-gradient(ellipse 80% 50% at 70% 0%, rgba(255,140,60,0.07) 0%, transparent 60%)",
  };

  // Golden hour / sunset 16–20: deep amber corner flood
  if (h >= 16 && h < 20) return {
    backgroundImage: [
      "radial-gradient(ellipse 100% 65% at 100% 100%, rgba(255,96,55,0.13) 0%, transparent 60%)",
      "radial-gradient(ellipse 70% 50% at 0% 85%, rgba(255,160,60,0.09) 0%, transparent 55%)",
      "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,180,80,0.05) 0%, transparent 50%)",
    ].join(", "),
  };

  // Night 20–5: cool indigo depth
  return {
    backgroundImage: [
      "radial-gradient(ellipse 90% 55% at 15% 5%, rgba(40,20,55,0.09) 0%, transparent 65%)",
      "radial-gradient(ellipse 70% 45% at 85% 90%, rgba(20,10,40,0.07) 0%, transparent 60%)",
    ].join(", "),
  };
}

export function useTimeAmbience(): React.CSSProperties {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const update = () => setStyle(ambienceForHour(new Date().getHours()));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return style;
}
