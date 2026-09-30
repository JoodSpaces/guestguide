"use client";

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { WEBSITE_URL } from "@/lib/site";
import { Orb, type OrbState } from "@/components/ui/Orb";

interface Props { token: string; isAr: boolean; guestFirstName: string }
type Line = { role: "guest" | "agent"; text: string };
type Chip = { label: string; href?: string };

const COPY = {
  en: {
    start: "Tap to talk", connecting: "Connecting…", listening: "Listening", speaking: "Speaking", end: "End conversation",
    mute: "Mute", unmute: "Unmute", team: "Message the JOOD team instead",
    hint: "Ask about the house, check-out or what's nearby. I can also report a problem or request a service for you. For anything urgent, message the team.",
    mic: "We couldn't reach your microphone. Allow microphone access in your browser, or message the team.",
    limit: "That's enough voice chat for today. The team is always one message away.",
    stay: "You've used all the voice conversations included with this stay. The team is one message away.",
    budget: "Voice chat is resting for this month. The team is one message away.",
    fail: "Voice isn't available right now. You can message the team any time.",
    privacy: "Your voice is processed by our voice provider during the conversation. See the privacy notice.",
    sent: "Sent to the team", screens: { door_code: "Open the door code", house_guide: "Open the house guide", services: "Open services", discover: "Open Discover", requests: "Open messages" },
  },
  ar: {
    start: "اضغط للتحدث", connecting: "جارٍ الاتصال…", listening: "أستمع", speaking: "أتحدث", end: "إنهاء المحادثة",
    mute: "كتم", unmute: "إلغاء الكتم", team: "راسل فريق جود بدلاً من ذلك",
    hint: "اسأل عن البيت أو المغادرة أو ما حولك. يمكنني أيضاً الإبلاغ عن مشكلة أو طلب خدمة نيابةً عنك. لأي أمر عاجل راسل الفريق.",
    mic: "لم نتمكن من الوصول إلى الميكروفون. اسمح بالوصول من المتصفح، أو راسل الفريق.",
    limit: "يكفي هذا القدر من المحادثة الصوتية اليوم. الفريق على بعد رسالة.",
    stay: "استخدمت كل المحادثات الصوتية المتاحة لهذه الإقامة. الفريق على بعد رسالة.",
    budget: "المحادثة الصوتية في استراحة هذا الشهر. الفريق على بعد رسالة.",
    fail: "المحادثة الصوتية غير متاحة الآن. يمكنك مراسلة الفريق في أي وقت.",
    privacy: "يعالج مزوّد الصوت صوتك أثناء المحادثة. راجع إشعار الخصوصية.",
    sent: "أُرسل إلى الفريق", screens: { door_code: "افتح رمز الباب", house_guide: "افتح دليل البيت", services: "افتح الخدمات", discover: "افتح استكشف", requests: "افتح الرسائل" },
  },
} as const;

const SCREEN_PATH = { door_code: "arrival", house_guide: "manual", services: "services", discover: "discover", requests: "requests" } as const;
type ScreenKey = keyof typeof SCREEN_PATH;

function Inner({ token, isAr }: Props) {
  const c = COPY[isAr ? "ar" : "en"];
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [caption, setCaption] = useState("");
  const [amp, setAmp] = useState(0);
  const [flash, setFlash] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);

  // Everything the end-of-call log needs lives in refs so the tool callbacks never go stale.
  const transcript = useRef<Line[]>([]);
  const unanswered = useRef<string[]>([]);
  const actions = useRef<string[]>([]);
  const sessionId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const pendingContext = useRef<string | null>(null);
  const logged = useRef(true);

  function pulse() { setFlash(true); setTimeout(() => setFlash(false), 1600); }

  async function post(category: "maintenance" | "service" | "other", text: string, urgent: boolean) {
    const res = await fetch("/api/guest/requests", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, category, body: `[Voice concierge] ${text}`.slice(0, 2000), urgency: urgent ? "urgent" : "normal" }),
    }).catch(() => null);
    return !!res?.ok;
  }
  function done(kind: string) { actions.current.push(kind); pulse(); setChips((x) => [...x.filter((y) => y.href), { label: c.sent }]); }

  const conv = useConversation({
    onMessage: (m: { source?: string; message?: string }) => {
      // The voice model marks its tone with tags like [Warmly]; they are for the voice, not for reading.
      const text = (m.message ?? "").replace(/\[[^\]]{1,30}\]/g, "").replace(/\s{2,}/g, " ").trim();
      if (!text) return;
      transcript.current.push({ role: m.source === "ai" ? "agent" : "guest", text });
      if (m.source === "ai") setCaption(text);
    },
    // The agent asked for a tool this screen does not have: keep a trace so the log shows it.
    onUnhandledClientToolCall: (t: { tool_name?: string }) => { actions.current.push(`unhandled:${t?.tool_name ?? "?"}`); },
    onError: (m: unknown) => { setError(c.fail); setDetail(String((m as { message?: string })?.message ?? m).slice(0, 120)); },
    clientTools: {
      report_problem: async (p: Record<string, unknown>) => {
        const ok = await post("maintenance", String(p.description ?? ""), p.urgent === true);
        if (ok) done("report_problem");
        return ok ? "Reported to the JOOD team." : "Could not send; tell the guest to use Contact the team.";
      },
      request_service: async (p: Record<string, unknown>) => {
        const ok = await post("service", `${p.service ?? ""}${p.details ? ` — ${p.details}` : ""}`, false);
        if (ok) done("request_service");
        return ok ? "Requested. The team will confirm; nothing is charged until they do." : "Could not send; tell the guest to use Order a service.";
      },
      message_team: async (p: Record<string, unknown>) => {
        const ok = await post("other", String(p.message ?? ""), p.urgent === true);
        if (ok) done("message_team");
        return ok ? "Message sent to the team." : "Could not send; tell the guest to use Contact the team.";
      },
      open_screen: async (p: Record<string, unknown>) => {
        const key = String(p.screen) as ScreenKey;
        if (!(key in SCREEN_PATH)) return "Unknown screen.";
        setChips((x) => [...x.filter((y) => y.href !== `/s/${token}/${SCREEN_PATH[key]}`), { label: c.screens[key], href: `/s/${token}/${SCREEN_PATH[key]}` }]);
        pulse();
        return "A button to open it is now on the guest's screen. Tell them to tap it.";
      },
      flag_unanswered: async (p: Record<string, unknown>) => {
        const q = String(p.question ?? "").slice(0, 300);
        if (q) unanswered.current.push(q);
        return "Noted for the team.";
      },
    },
  });
  const { status, isSpeaking, isMuted } = conv;
  const live = status === "connected";
  const convRef = useRef(conv);
  useEffect(() => { convRef.current = conv; });

  // Hand the agent the private stay context the moment the call is up.
  useEffect(() => {
    if (live && pendingContext.current) { convRef.current.sendContextualUpdate(pendingContext.current); pendingContext.current = null; }
  }, [live]);

  function saveLog(beacon: boolean) {
    if (logged.current || !sessionId.current) return;
    logged.current = true;
    const payload = JSON.stringify({
      token, sessionId: sessionId.current, durationSec: Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000)),
      transcript: transcript.current.slice(-200), unanswered: unanswered.current, actions: actions.current,
    });
    if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/stay/voice/log", new Blob([payload], { type: "application/json" }));
    else fetch("/api/stay/voice/log", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
  }

  // The call ended (by either side or by an error): save how it went.
  const prev = useRef(status);
  useEffect(() => { if (prev.current === "connected" && status !== "connected") saveLog(false); prev.current = status; });
  useEffect(() => {
    const h = () => saveLog(true);
    window.addEventListener("pagehide", h);
    return () => { window.removeEventListener("pagehide", h); saveLog(true); try { convRef.current.endSession(); } catch { /* already closed */ } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The orb breathes with whichever side is making sound.
  useEffect(() => {
    if (!live) return;
    let raf = 0; let last = 0;
    const tick = (t: number) => {
      if (t - last > 50) {
        last = t;
        const k = convRef.current;
        setAmp(Math.min(1, (k.isSpeaking ? k.getOutputVolume() : k.getInputVolume()) * 1.6));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  async function start() {
    setError(null); setDetail(""); setCaption(""); setChips([]);
    transcript.current = []; unanswered.current = []; actions.current = [];
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { setError(c.mic); setDetail(String((e as Error)?.name ?? "mic")); return; }
    const res = await fetch("/api/stay/voice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, locale: isAr ? "ar" : "en" }) }).catch(() => null);
    if (!res || !res.ok) {
      const code = res ? ((await res.json().catch(() => ({}))) as { error?: string }).error : undefined;
      setError(code === "budget" ? c.budget : code === "stay_limit" ? c.stay : res?.status === 429 ? c.limit : c.fail); setDetail(`route ${res?.status ?? "network"}`); return;
    }
    const j = (await res.json()) as { signedUrl: string; context: string; sessionId: string | null };
    sessionId.current = j.sessionId; pendingContext.current = j.context; startedAt.current = Date.now(); logged.current = !j.sessionId;
    conv.startSession({ signedUrl: j.signedUrl, libsampleratePath: "/vendor/libsamplerate.worklet.js" });
  }

  const state: OrbState = status === "connecting" || flash ? "thinking" : live ? (isSpeaking ? "speaking" : "listening") : "idle";
  const label = status === "connecting" ? c.connecting : live ? (isSpeaking ? c.speaking : c.listening) : c.start;
  const busy = status === "connecting";

  return (
    <div style={{ padding: "36px 24px 24px", textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
      <Orb size={200} state={state} amp={live ? amp : 0} label={label} onClick={live || busy ? undefined : start} />
      <p aria-live="polite" style={{ marginTop: 22, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--jood-ink-subtle)" }}>{label}</p>
      <p aria-live="polite" style={{ minHeight: 72, margin: "14px 0", fontSize: 16, lineHeight: 1.6, color: "var(--jood-ink)" }}>
        {error ?? (caption || (live ? "" : c.hint))}
      </p>
      {error && detail && <p style={{ fontSize: 11, color: "var(--jood-ink-subtle)", marginTop: -8, wordBreak: "break-word" }}>{detail}</p>}
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 14 }}>
          {chips.map((k) => k.href
            ? <a key={k.href} href={k.href} target="_blank" rel="noopener noreferrer" style={chip(true)}>{k.label} →</a>
            : <span key={k.label} style={chip(false)}>✓ {k.label}</span>)}
        </div>
      )}
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

const chip = (link: boolean): React.CSSProperties => ({
  padding: "8px 14px", borderRadius: 999, fontSize: 13, textDecoration: "none",
  border: "1px solid var(--jood-line, rgba(255,255,255,.2))", color: "var(--jood-ink)",
  background: link ? "var(--stay-glass-bg, rgba(255,255,255,.08))" : "transparent",
});
const btn = (primary: boolean): React.CSSProperties => ({
  padding: "11px 20px", borderRadius: 999, fontSize: 14, cursor: "pointer",
  border: "1px solid var(--jood-line, rgba(255,255,255,.2))",
  background: primary ? "var(--jood-ink)" : "transparent",
  color: primary ? "var(--jood-ground)" : "var(--jood-ink)",
});

export function VoiceConcierge(props: Props) {
  return <ConversationProvider><Inner {...props} /></ConversationProvider>;
}
