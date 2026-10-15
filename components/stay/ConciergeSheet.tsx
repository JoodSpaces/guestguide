"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConciergeClient } from "@/components/stay/ConciergeClient";
import { VoiceConcierge } from "@/components/stay/VoiceConcierge";
import { useSwipeDown } from "@/lib/gestures";
import { haptic } from "@/lib/haptics";
import { detectEmergency } from "@/lib/emergency-rules";
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
  startMode?: "type" | "talk" | "write";
  onClose: () => void;
}

/**
 * The concierge as a card that rises from the bottom of the home. Type or talk, whichever is switched on;
 * with neither, a way to message the team. Swipe it down (or tap outside) to close.
 */
export function ConciergeSheet({ token, isAr, phase, guestFirstName, propertyName, aiOn, voiceOn, seed, startMode, onClose }: Props) {
  // With text AI on: Type (and Talk if voice is on). Without it: Write to the team (and Talk if voice is on).
  const first: "type" | "talk" | "write" = startMode === "talk" && voiceOn ? "talk" : aiOn ? "type" : startMode === "write" || !voiceOn ? "write" : "talk";
  const [mode, setMode] = useState<"type" | "talk" | "write">(first);
  const swipe = useSwipeDown(onClose);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);


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
          {voiceOn && (
            <div className="cs-mode" role="tablist">
              <button type="button" role="tab" aria-selected={mode !== "talk"} onClick={() => { haptic(); setMode(aiOn ? "type" : "write"); }}>{aiOn ? (isAr ? "اكتب" : "Type") : (isAr ? "اكتب للفريق" : "Write")}</button>
              <button type="button" role="tab" aria-selected={mode === "talk"} onClick={() => { haptic(); setMode("talk"); }}>{isAr ? "تحدث" : "Talk"}</button>
            </div>
          )}
          <button type="button" className="aura-round" style={{ width: 36, height: 36 }} onClick={onClose} aria-label={isAr ? "إغلاق" : "Close"}>✕</button>
        </header>

        <div className="cs-body">
          {mode === "write" || (!aiOn && !voiceOn) ? (
            <TeamComposer token={token} isAr={isAr} seed={seed} />
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

/** Without text AI, a typed question becomes a message to the JOOD team: written here, sent on one tap. */
function TeamComposer({ token, isAr, seed }: { token: string; isAr: boolean; seed?: string }) {
  const [text, setText] = useState(seed ?? "");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send() {
    const body = text.trim();
    if (!body || state === "sending") return;
    setState("sending");
    const urgent = detectEmergency(body);
    const res = await fetch("/api/guest/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, body, category: urgent ? "maintenance" : "other", urgency: urgent ? "urgent" : "normal" }),
    }).catch(() => null);
    if (res?.ok) { haptic("success"); setState("sent"); setText(""); } else setState("error");
  }

  if (state === "sent") {
    return (
      <div className="home-note" style={{ marginTop: 0, textAlign: "center" }}>
        <p style={{ fontWeight: 650 }}>{isAr ? "أُرسلت إلى فريق جود" : "Sent to the JOOD team"}</p>
        <p style={{ color: "var(--jood-ink-muted)", fontSize: ".9rem" }}>
          {isAr ? "سيظهر ردّهم في أعلى الصفحة الرئيسية وفي شاشة الطلبات." : "Their reply will show at the top of your home and under Requests."}
        </p>
        <button type="button" className="live-link" onClick={() => setState("idle")}>{isAr ? "اكتب رسالة أخرى" : "Write another"}</button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ margin: 0, fontSize: ".9rem", color: "var(--jood-ink-muted)", lineHeight: 1.5 }}>
        {isAr ? "اكتب سؤالك أو طلبك وسيردّ عليك شخص من فريق جود." : "Write your question or request and a person from the JOOD team will reply."}
      </p>
      <textarea
        className="svc-notes"
        style={{ minHeight: 120, margin: 0 }}
        value={text}
        onChange={(e) => { setText(e.target.value); if (state === "error") setState("idle"); }}
        placeholder={isAr ? "كيف يمكننا مساعدتك؟" : "How can we help you?"}
        dir={isAr ? "rtl" : "ltr"}
        autoFocus
      />
      {state === "error" && <p role="alert" style={{ margin: 0, color: "#FF9C9C", fontSize: 13 }}>{isAr ? "تعذّر الإرسال. حاول مرة أخرى." : "We couldn't send it. Please try again."}</p>}
      <button type="button" className="vpill" onClick={send} disabled={!text.trim() || state === "sending"} style={{ background: "#fff", color: "#0E0908", boxShadow: "none", opacity: text.trim() ? 1 : 0.55 }}>
        <span>{state === "sending" ? (isAr ? "جاري الإرسال…" : "Sending…") : (isAr ? "أرسل إلى الفريق" : "Send to the team")}</span>
        <i aria-hidden style={{ background: "#0E0908", color: "#fff" }}>{isAr ? "←" : "→"}</i>
      </button>
    </div>
  );
}
