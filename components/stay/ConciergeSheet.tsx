"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConciergeClient } from "@/components/stay/ConciergeClient";
import { VoiceConcierge } from "@/components/stay/VoiceConcierge";
import { useSwipeDown } from "@/lib/gestures";
import { haptic } from "@/lib/haptics";
import type { Phase } from "@/lib/token";

interface Props {
  token: string;
  isAr: boolean;
  phase: Phase;
  guestFirstName: string;
  propertyName: string;
  aiOn: boolean;
  voiceOn: boolean;
  seed?: string;
  onClose: () => void;
}

/**
 * The concierge as a card that rises from the bottom of the home. Type or talk, whichever is switched on;
 * with neither, a way to message the team. Swipe it down (or tap outside) to close.
 */
export function ConciergeSheet({ token, isAr, phase, guestFirstName, propertyName, aiOn, voiceOn, seed, onClose }: Props) {
  const [mode, setMode] = useState<"type" | "talk">(aiOn ? "type" : "talk");
  const swipe = useSwipeDown(onClose);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const neither = !aiOn && !voiceOn;

  return (
    <div className="cs-wrap" role="dialog" aria-modal="true" aria-label={isAr ? "المساعد" : "Concierge"}>
      <button type="button" className="cs-scrim" aria-label={isAr ? "إغلاق" : "Close"} onClick={onClose} />
      <section className="cs-sheet" dir={isAr ? "rtl" : "ltr"} style={{ transform: swipe.offset ? `translateY(${swipe.offset}px)` : undefined, transition: swipe.offset ? "none" : undefined }}>
        <div className="cs-glow" aria-hidden />
        <div className="svc-grab-zone" {...swipe.handlers}><div className="svc-grab" /></div>

        <header className="cs-head">
          <span className="cs-live" aria-hidden />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{isAr ? "كونسيرج جود" : "JOOD Concierge"}</b>
            <small>{propertyName}</small>
          </div>
          {aiOn && voiceOn && (
            <div className="cs-mode" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "type"} onClick={() => { haptic(); setMode("type"); }}>{isAr ? "اكتب" : "Type"}</button>
              <button type="button" role="tab" aria-selected={mode === "talk"} onClick={() => { haptic(); setMode("talk"); }}>{isAr ? "تحدث" : "Talk"}</button>
            </div>
          )}
          <button type="button" className="aura-round" style={{ width: 36, height: 36 }} onClick={onClose} aria-label={isAr ? "إغلاق" : "Close"}>✕</button>
        </header>

        <div className="cs-body">
          {neither ? (
            <div className="home-note" style={{ marginTop: 0, textAlign: "center" }}>
              <p style={{ fontWeight: 650 }}>{isAr ? "نحن على بعد رسالة" : "We're one message away"}</p>
              <p style={{ color: "var(--jood-ink-muted)", fontSize: ".9rem" }}>
                {isAr ? "اكتب لفريق جود وسيرد عليك شخص حقيقي." : "Message the JOOD team and a person will reply."}
              </p>
              <Link href={`/s/${token}/requests`} className="vpill" style={{ marginTop: 14, textDecoration: "none", background: "#fff", color: "#0E0908", boxShadow: "none" }}>
                <span>{isAr ? "راسل الفريق" : "Message the team"}</span><i aria-hidden style={{ background: "#0E0908", color: "#fff" }}>{isAr ? "←" : "→"}</i>
              </Link>
            </div>
          ) : mode === "talk" && voiceOn ? (
            <div style={{ overflowY: "auto", height: "100%" }}>
              <VoiceConcierge token={token} isAr={isAr} guestFirstName={guestFirstName} />
            </div>
          ) : (
            <ConciergeClient token={token} locale={isAr ? "ar" : "en"} phase={phase} guestFirstName={guestFirstName} propertyName={propertyName} compact initialQuestion={seed} />
          )}
        </div>
      </section>
    </div>
  );
}
