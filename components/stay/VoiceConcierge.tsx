"use client";

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { WEBSITE_URL } from "@/lib/site";
import { Orb, type OrbState } from "@/components/ui/Orb";

interface Props { token: string; isAr: boolean; guestFirstName: string }

const COPY = {
  en: {
    start: "Tap to talk", connecting: "Connecting…", listening: "Listening", speaking: "Speaking", end: "End conversation",
    mute: "Mute", unmute: "Unmute", team: "Message the JOOD team instead",
    hint: "Ask about the house, Wi-Fi, check-out or what's nearby. For anything urgent, message the team.",
    mic: "We couldn't reach your microphone. Allow microphone access in your browser, or message the team.",
    limit: "That's enough voice chat for today. The team is always one message away.",
    fail: "Voice isn't available right now. You can message the team any time.",
    privacy: "Your voice is processed by our voice provider during the conversation. See the privacy notice.",
  },
  ar: {
    start: "اضغط للتحدث", connecting: "جارٍ الاتصال…", listening: "أستمع", speaking: "أتحدث", end: "إنهاء المحادثة",
    mute: "كتم", unmute: "إلغاء الكتم", team: "راسل فريق جود بدلاً من ذلك",
    hint: "اسأل عن البيت أو الواي فاي أو المغادرة أو ما حولك. لأي أمر عاجل راسل الفريق.",
    mic: "لم نتمكن من الوصول إلى الميكروفون. اسمح بالوصول من المتصفح، أو راسل الفريق.",
    limit: "يكفي هذا القدر من المحادثة الصوتية اليوم. الفريق على بعد رسالة.",
    fail: "المحادثة الصوتية غير متاحة الآن. يمكنك مراسلة الفريق في أي وقت.",
    privacy: "يعالج مزوّد الصوت صوتك أثناء المحادثة. راجع إشعار الخصوصية.",
  },
} as const;

function Inner({ token, isAr }: Props) {
  const c = COPY[isAr ? "ar" : "en"];
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [amp, setAmp] = useState(0);
  const conv = useConversation({
    onMessage: (m: { source?: string; message?: string }) => { if (m.source === "ai" && m.message) setCaption(m.message); },
    onError: () => setError(c.fail),
  });
  const { status, isSpeaking, isMuted } = conv;
  const live = status === "connected";
  const convRef = useRef(conv);
  useEffect(() => { convRef.current = conv; });

  // The orb breathes with whichever side is making sound.
  useEffect(() => {
    if (!live) return;
    let raf = 0; let last = 0;
    const tick = (t: number) => {
      if (t - last > 50) {
        last = t;
        const k = convRef.current;
        const v = k.isSpeaking ? k.getOutputVolume() : k.getInputVolume();
        setAmp(Math.min(1, v * 1.6));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  useEffect(() => () => { try { convRef.current.endSession(); } catch { /* already closed */ } }, []);

  async function start() {
    setError(null); setCaption("");
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setError(c.mic); return; }
    const res = await fetch("/api/stay/voice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    if (!res || !res.ok) { setError(res?.status === 429 ? c.limit : c.fail); return; }
    const { signedUrl } = (await res.json()) as { signedUrl: string };
    conv.startSession({ signedUrl });
  }

  const state: OrbState = status === "connecting" ? "thinking" : live ? (isSpeaking ? "speaking" : "listening") : "idle";
  const label = status === "connecting" ? c.connecting : live ? (isSpeaking ? c.speaking : c.listening) : c.start;
  const busy = status === "connecting";

  return (
    <div style={{ padding: "36px 24px 24px", textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
      <Orb size={200} state={state} amp={live ? amp : 0} label={label} onClick={live || busy ? undefined : start} />
      <p aria-live="polite" style={{ marginTop: 22, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--jood-ink-subtle)" }}>{label}</p>
      <p aria-live="polite" style={{ minHeight: 72, margin: "14px 0", fontSize: 16, lineHeight: 1.6, color: "var(--jood-ink)" }}>
        {error ?? (caption || (live ? "" : c.hint))}
      </p>
      {live && (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button type="button" onClick={() => conv.setMuted(!isMuted)} style={btn(false)}>{isMuted ? c.unmute : c.mute}</button>
          <button type="button" onClick={() => conv.endSession()} style={btn(true)}>{c.end}</button>
        </div>
      )}
      <div style={{ marginTop: 28 }}>
        <a href={`/s/${token}/requests`} style={{ fontSize: 14, color: "var(--jood-ink-muted)", textDecoration: "underline" }}>{c.team}</a>
        <p style={{ marginTop: 14, fontSize: 12, lineHeight: 1.6, color: "var(--jood-ink-subtle)" }}>
          {c.privacy} <a href={`${WEBSITE_URL}/legal#privacy`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{isAr ? "الخصوصية" : "Privacy"}</a>
        </p>
      </div>
    </div>
  );
}

const btn = (primary: boolean): React.CSSProperties => ({
  padding: "11px 20px", borderRadius: 999, fontSize: 14, cursor: "pointer",
  border: "1px solid var(--jood-line, rgba(255,255,255,.2))",
  background: primary ? "var(--jood-ink)" : "transparent",
  color: primary ? "var(--jood-ground)" : "var(--jood-ink)",
});

export function VoiceConcierge(props: Props) {
  return <ConversationProvider><Inner {...props} /></ConversationProvider>;
}
