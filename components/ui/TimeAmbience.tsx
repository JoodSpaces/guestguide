"use client";

import { useState, useEffect } from "react";

function ambienceForHour(h: number): React.CSSProperties {
  // Dawn 5–8: intense amber flood from top, warm blush from corners
  if (h >= 5 && h < 9) return {
    backgroundImage: [
      "radial-gradient(ellipse 130% 60% at 50% 0%, rgba(255,190,70,0.32) 0%, transparent 65%)",
      "radial-gradient(ellipse 80% 45% at 90% 0%, rgba(255,130,50,0.20) 0%, transparent 55%)",
      "radial-gradient(ellipse 60% 35% at 10% 0%, rgba(255,160,60,0.16) 0%, transparent 50%)",
      "radial-gradient(ellipse 70% 40% at 70% 100%, rgba(255,100,40,0.10) 0%, transparent 55%)",
    ].join(", "),
  };

  // Morning 9–11: bright warm, softer
  if (h >= 9 && h < 11) return {
    backgroundImage: [
      "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(240,215,160,0.18) 0%, transparent 62%)",
      "radial-gradient(ellipse 60% 35% at 80% 0%, rgba(255,175,80,0.10) 0%, transparent 50%)",
    ].join(", "),
  };

  // Midday 11–15: near-clean, very faint warm center
  if (h >= 11 && h < 15) return {
    backgroundImage: "radial-gradient(ellipse 70% 40% at 50% 20%, rgba(220,210,190,0.07) 0%, transparent 60%)",
  };

  // Late afternoon 15–16: warmth building from right
  if (h >= 15 && h < 16) return {
    backgroundImage: [
      "radial-gradient(ellipse 90% 55% at 85% 0%, rgba(255,150,60,0.16) 0%, transparent 60%)",
      "radial-gradient(ellipse 60% 40% at 30% 100%, rgba(255,140,50,0.08) 0%, transparent 55%)",
    ].join(", "),
  };

  // Golden hour / sunset 16–20: dramatic coral + amber flood
  if (h >= 16 && h < 20) return {
    backgroundImage: [
      "radial-gradient(ellipse 110% 70% at 100% 100%, rgba(255,96,55,0.30) 0%, transparent 62%)",
      "radial-gradient(ellipse 80% 55% at 0% 80%, rgba(255,155,55,0.22) 0%, transparent 58%)",
      "radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255,180,70,0.12) 0%, transparent 52%)",
      "radial-gradient(ellipse 60% 40% at 85% 10%, rgba(255,80,40,0.10) 0%, transparent 50%)",
    ].join(", "),
  };

  // Night 20–5: deep indigo + cool violet depth
  return {
    backgroundImage: [
      "radial-gradient(ellipse 100% 60% at 15% 5%, rgba(35,15,55,0.22) 0%, transparent 65%)",
      "radial-gradient(ellipse 80% 50% at 85% 90%, rgba(15,8,40,0.18) 0%, transparent 62%)",
      "radial-gradient(ellipse 60% 35% at 50% 50%, rgba(20,10,45,0.08) 0%, transparent 60%)",
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
