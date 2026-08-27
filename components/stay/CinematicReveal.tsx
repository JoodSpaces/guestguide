"use client";

import { useState, useEffect } from "react";

interface Props {
  token: string;
  propertyName: string;
  locale: string;
}

type Stage = "logo" | "name" | "tagline" | "exiting";

export function CinematicReveal({ token, propertyName, locale }: Props) {
  const [stage, setStage] = useState<Stage>("logo");
  const [mounted, setMounted] = useState(false);
  const isAr = locale === "ar";

  useEffect(() => {
    const key = `jood_cinematic_${token}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setMounted(true);

    const t1 = setTimeout(() => setStage("name"), 900);
    const t2 = setTimeout(() => setStage("tagline"), 1700);
    const t3 = setTimeout(() => setStage("exiting"), 2900);
    const t4 = setTimeout(() => setMounted(false), 3550);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [token]);

  if (!mounted) return null;

  const isExiting = stage === "exiting";

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        backgroundColor: "var(--jood-ink)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? "opacity 650ms cubic-bezier(0.16,1,0.3,1)" : "none",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {/* Stage 1: JOOD coral logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/jood-logo-coral.png"
        alt=""
        style={{
          height: "44px",
          width: "auto",
          position: "absolute",
          opacity: stage === "logo" ? 1 : 0,
          transform: stage === "logo" ? "scale(1)" : "scale(0.92)",
          transition: "opacity 500ms cubic-bezier(0.16,1,0.3,1), transform 500ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {/* Stage 2: Property name */}
      <div
        style={{
          textAlign: "center",
          opacity: stage === "name" || stage === "tagline" || stage === "exiting" ? 1 : 0,
          transform: stage === "name" || stage === "tagline" || stage === "exiting"
            ? "translateY(0)"
            : "translateY(24px)",
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "10px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(245,244,237,0.38)",
            marginBottom: "14px",
          }}
        >
          {isAr ? "أهلاً بك في" : "Welcome to"}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "clamp(2.4rem, 9vw, 4.5rem)",
            fontWeight: 400,
            color: "var(--jood-ground)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {propertyName}
        </h1>
      </div>

      {/* Stage 3: "Your stay begins" tagline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          opacity: stage === "tagline" || stage === "exiting" ? 1 : 0,
          transition: "opacity 500ms cubic-bezier(0.16,1,0.3,1)",
          marginTop: "8px",
        }}
      >
        <div style={{ width: "36px", height: "1px", background: "rgba(245,244,237,0.2)" }} />
        <p
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "9.5px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--jood-accent)",
            margin: 0,
          }}
        >
          {isAr ? "تبدأ إقامتك الآن" : "Your stay begins now"}
        </p>
        <div style={{ width: "36px", height: "1px", background: "rgba(245,244,237,0.2)" }} />
      </div>
    </div>
  );
}
