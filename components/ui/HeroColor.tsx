"use client";

import { useEffect } from "react";

interface Props {
  imageUrl: string;
}

export function HeroColor({ imageUrl }: Props) {
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const SIZE = 64;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        let hSum = 0, count = 0;
        for (let i = 0; i < data.length; i += 4 * 6) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const delta = max - min;
          const l = (max + min) / 510;
          if (delta < 38 || l < 0.15 || l > 0.85) continue;
          let h = 0;
          if (max === r) h = ((g - b) / delta + 6) % 6;
          else if (max === g) h = (b - r) / delta + 2;
          else h = (r - g) / delta + 4;
          hSum += h * 60;
          count++;
        }
        if (count < 8) return;

        const dominantHue = hSum / count;
        // Default accent H=14° (orange-red). Nudge up to ±22° toward dominant hue.
        const defaultH = 14;
        let diff = dominantHue - defaultH;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const shift = Math.max(-22, Math.min(22, diff * 0.32));
        const newH = ((defaultH + shift) + 360) % 360;

        document.documentElement.style.setProperty("--jood-accent", `hsl(${newH.toFixed(1)}, 100%, 61%)`);
      } catch {}
    };
    img.src = imageUrl;
    return () => {
      document.documentElement.style.removeProperty("--jood-accent");
    };
  }, [imageUrl]);

  return null;
}
