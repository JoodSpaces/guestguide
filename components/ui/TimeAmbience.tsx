"use client";

import { useState, useEffect } from "react";

function ambienceForHour(h: number): React.CSSProperties {
  // Dawn 5–8: warm rose from top-center
  if (h >= 5 && h < 9) {
    return {
      backgroundImage:
        "radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255,175,100,0.07) 0%, transparent 70%)",
    };
  }
  // Late afternoon / golden hour 16–20
  if (h >= 16 && h < 20) {
    return {
      backgroundImage:
        "radial-gradient(ellipse 80% 55% at 90% 100%, rgba(255,110,40,0.08) 0%, transparent 65%)",
    };
  }
  // Night 20–5
  if (h >= 20 || h < 5) {
    return {
      backgroundImage:
        "radial-gradient(ellipse 75% 50% at 10% 0%, rgba(30,30,60,0.045) 0%, transparent 70%)",
    };
  }
  // Midday: clean — no overlay
  return {};
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
