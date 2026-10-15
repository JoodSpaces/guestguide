"use client";

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { WEBSITE_URL } from "@/lib/site";
import { VoiceDial } from "@/components/stay/VoiceDial";
import { haptic } from "@/lib/haptics";
import { publishAnswer } from "@/lib/live-answer";
import { RequestConfirm, type RequestDraft, type RequestCategory } from "@/components/stay/RequestConfirm";

interface Props { token: string; isAr: boolean; guestFirstName: string }
type Line = { role: "guest" | "agent"; text: string };
type Chip = { label: string; href?: string; pay?: boolean };

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
    sent: "Sent to the team", call: "Call the on-call team", screens: { door_code: "Open the door code", house_guide: "Open the house guide", services: "Open services", discover: "Open Discover", requests: "Open messages" },
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
    sent: "أُرسل إلى الفريق", call: "اتصل بفريق الطوارئ", screens: { door_code: "افتح رمز الباب", house_guide: "افتح دليل البيت", services: "افتح الخدمات", discover: "افتح استكشف", requests: "افتح الرسائل" },
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

  // Anything the agent wants to send to the team is first shown to the guest on a card (what, type, urgency) and goes only if they tap Send.
  // Emergencies are the one exception: they are never held back.
  type Decision = { ok: true; draft: RequestDraft } | { ok: false; reason: "cancelled" | "no_answer" | "ended" };
  const [ask, setAsk] = useState<{ draft: RequestDraft; settle: (d: Decision) => void } | null>(null);
  const askRef = useRef(ask);
  useEffect(() => { askRef.current = ask; });
  function askConfirm(draft: RequestDraft): Promise<Decision> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => { setAsk(null); resolve({ ok: false, reason: "no_answer" }); }, 90_000);
      setAsk({ draft, settle: (d) => { clearTimeout(timer); setAsk(null); resolve(d); } });
      try { convRef.current.sendContextualUpdate("A confirmation card with the request is now open on the guest's screen. Tell them in one short sentence to read it and tap Send, or Cancel. Do not say it has been sent until the result comes back."); } catch { /* the call may have just ended */ }
    });
  }
  const notSent = (d: { reason: string }) => d.reason === "no_answer"
    ? "The guest did not answer the confirmation card, so NOTHING was sent. Say that, and offer to try again."
    : "The guest chose not to send it, so NOTHING was sent. Say that is fine and offer to change the wording or help another way.";

  async function post(category: RequestCategory, text: string, urgent: boolean) {
    const res = await fetch("/api/guest/requests", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, category, body: `[Voice concierge] ${text}`.slice(0, 2000), urgency: urgent ? "urgent" : "normal" }),
    }).catch(() => null);
    return !!res?.ok;
  }
  function done(kind: string) { actions.current.push(kind); pulse(); setChips((x) => [...x.filter((y) => y.href), { label: c.sent }]); }

  // Read-only lookups run on the server against this guest's own stay; the agent gets short text back and speaks it.
  async function lookup(tool: string, args: Record<string, unknown>) {
    actions.current.push(`lookup:${tool}`);
    const res = await fetch("/api/stay/voice/tool", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, tool, args, locale: isAr ? "ar" : "en" }),
    }).catch(() => null);
    if (!res?.ok) return "That lookup failed. Say so briefly and offer to message the team.";
    const j = (await res.json().catch(() => ({}))) as { result?: string };
    return j.result ?? "No result.";
  }

  // Actions beyond a lookup (late check-out check, emergency). Same server-side guard as lookups; the agent gets plain text back.
  async function act(body: Record<string, unknown>) {
    const res = await fetch("/api/stay/voice/action", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, ...body }),
    }).catch(() => null);
    const j = (await res?.json().catch(() => ({}))) as { result?: string; onCallPhone?: string | null; ok?: boolean; pay?: { url: string; label: string } | null } | undefined;
    return { ok: !!res?.ok, result: j?.result, phone: j?.onCallPhone ?? null, saved: j?.ok, pay: j?.pay ?? null };
  }

  const conv = useConversation({
    onMessage: (m: { source?: string; message?: string }) => {
      // The voice model marks its tone with tags like [Warmly]; they are for the voice, not for reading.
      const text = (m.message ?? "").replace(/\[[^\]]{1,30}\]/g, "").replace(/\s{2,}/g, " ").trim();
      if (!text) return;
      transcript.current.push({ role: m.source === "ai" ? "agent" : "guest", text });
      if (m.source === "ai") { setCaption(text); publishAnswer(token, { a: text, via: "voice" }); }
    },
    // The agent asked for a tool this screen does not have: keep a trace so the log shows it.
    onUnhandledClientToolCall: (t: { tool_name?: string }) => { actions.current.push(`unhandled:${t?.tool_name ?? "?"}`); },
    onError: (m: unknown) => { setError(c.fail); setDetail(String((m as { message?: string })?.message ?? m).slice(0, 120)); },
    clientTools: {
      report_problem: async (p: Record<string, unknown>) => {
        const d = await askConfirm({ text: String(p.description ?? ""), category: "maintenance", urgent: p.urgent === true });
        if (!d.ok) { actions.current.push(`declined:report_problem:${d.reason}`); return notSent(d); }
        const ok = await post(d.draft.category, d.draft.text, d.draft.urgent);
        if (ok) done("report_problem");
        return ok ? "Reported to the JOOD team." : "Could not send; tell the guest to use Contact the team.";
      },
      request_service: async (p: Record<string, unknown>) => {
        const d = await askConfirm({ text: `${p.service ?? ""}${p.details ? ` — ${p.details}` : ""}`, category: "service", urgent: false });
        if (!d.ok) { actions.current.push(`declined:request_service:${d.reason}`); return notSent(d); }
        const ok = await post(d.draft.category, d.draft.text, d.draft.urgent);
        if (ok) done("request_service");
        return ok ? "Requested. The team will confirm; nothing is charged until they do." : "Could not send; tell the guest to use Order a service.";
      },
      message_team: async (p: Record<string, unknown>) => {
        const d = await askConfirm({ text: String(p.message ?? ""), category: "other", urgent: p.urgent === true });
        if (!d.ok) { actions.current.push(`declined:message_team:${d.reason}`); return notSent(d); }
        const ok = await post(d.draft.category, d.draft.text, d.draft.urgent);
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
      get_services: (p: Record<string, unknown>) => lookup("get_services", p),
      get_request_status: (p: Record<string, unknown>) => lookup("get_request_status", p),
      get_nearby: (p: Record<string, unknown>) => lookup("get_nearby", p),
      get_my_stay: (p: Record<string, unknown>) => lookup("get_my_stay", p),
      search_house_guide: (p: Record<string, unknown>) => lookup("search_house_guide", p),
      check_late_checkout: async (p: Record<string, unknown>) => {
        actions.current.push("lookup:check_late_checkout");
        const r = await act({ action: "check_late_checkout", until: String(p.until ?? "") });
        return r.ok && r.result ? r.result : "The calendar check failed. Say so, and offer to send a late check-out request to the team with request_service.";
      },
      check_extension: async (p: Record<string, unknown>) => {
        actions.current.push("lookup:check_extension");
        const r = await act({ action: "check_extension", nights: Math.round(Number(p.nights)) });
        return r.ok && r.result ? r.result : "The availability check failed. Say so, and offer to send an extension request to the team with request_service.";
      },
      start_extension: async (p: Record<string, unknown>) => {
        actions.current.push("start_extension");
        const r = await act({ action: "start_extension", nights: Math.round(Number(p.nights)), currency: String(p.currency ?? ""), locale: isAr ? "ar" : "en" });
        // Only a payment page the server vetted (Stripe or Paymob over https) ever becomes a button.
        if (r.pay && /^https:\/\/(checkout\.stripe\.com|accept\.paymob\.com)\//.test(r.pay.url)) {
          const pay = r.pay;
          setChips((x) => [...x.filter((y) => !y.pay), { label: pay.label, href: pay.url, pay: true }]);
          pulse();
        }
        return r.ok && r.result ? r.result : "The payment page could not be opened. Say so, and offer to send the request to the team with request_service (service Extend stay).";
      },
      report_emergency: async (p: Record<string, unknown>) => {
        const r = await act({ action: "report_emergency", kind: String(p.kind ?? "other"), details: String(p.details ?? "") });
        if (r.phone) {
          const tel = `tel:${r.phone.replace(/[^\d+]/g, "")}`;
          setChips((x) => [...x.filter((y) => y.href !== tel), { label: c.call, href: tel }]);
        }
        if (r.ok && r.saved) { actions.current.push(`emergency:${String(p.kind ?? "other")}`); pulse(); }
        return r.ok && r.result ? r.result : `The alert could not be sent. Tell the guest to call the on-call number now${r.phone ? ` (${r.phone})` : " or use Contact the team"}.`;
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
  // If the call ends with a card still open, close it and tell the waiting tool call nothing was sent.
  useEffect(() => { if (!live && askRef.current) askRef.current.settle({ ok: false, reason: "ended" }); }, [live]);

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
    haptic("success");
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

  const label = status === "connecting" ? c.connecting : live ? (isSpeaking ? c.speaking : c.listening) : c.start;
  const busy = status === "connecting";

  const dialState = status === "connecting" || flash ? "connecting" : live ? (isSpeaking ? "speaking" : "listening") : "idle";

  return (
    <div style={{ maxWidth: 460, margin: "0 auto" }}>
      {ask && (
        <RequestConfirm
          isAr={isAr} draft={ask.draft} source="voice"
          onConfirm={(d) => ask.settle({ ok: true, draft: d })} onCancel={() => ask.settle({ ok: false, reason: "cancelled" })}
        />
      )}

      {/* A glowing sheet with the dial, one line of guidance, one pill */}
      <section className="aura-tile" style={{ "--a1": "#2FD6A0", "--a2": "#0B5C57", padding: "22px 18px 18px", borderRadius: 34, textAlign: "center" } as React.CSSProperties}>
        <p aria-live="polite" style={{ position: "relative", margin: "0 auto 14px", maxWidth: "28ch", minHeight: 52, fontSize: 16, fontWeight: 600, lineHeight: 1.45, color: "#fff" }}>
          {error ?? (caption || (live ? label : c.hint.split(".")[0] + "."))}
        </p>
        <div style={{ position: "relative" }}>
          <VoiceDial state={dialState} amp={live ? amp : 0} label={label} onClick={live || busy ? undefined : start} />
        </div>
        <p aria-live="polite" style={{ position: "relative", margin: "14px 0 16px", fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 700, letterSpacing: isAr ? 0 : "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>{label}</p>

        {!live ? (
          <button type="button" className="vpill" onClick={busy ? undefined : start} disabled={busy}>
            <span>{busy ? c.connecting : isAr ? "ابدأ المحادثة" : "Start talking"}</span><i aria-hidden>{isAr ? "←" : "→"}</i>
          </button>
        ) : (
          <div style={{ position: "relative", display: "flex", gap: 10 }}>
            <button type="button" className="vpill soft" onClick={() => conv.setMuted(!isMuted)} style={{ padding: "14px 18px", justifyContent: "center" }}>{isMuted ? c.unmute : c.mute}</button>
            <button type="button" className="vpill" onClick={() => conv.endSession()} style={{ padding: "14px 18px", justifyContent: "center", background: "#fff", color: "#0E0908" }}>{c.end}</button>
          </div>
        )}
      </section>

      {error && detail && <p style={{ fontSize: 11, color: "var(--jood-ink-subtle)", marginTop: 10, wordBreak: "break-word", textAlign: "center" }}>{detail}</p>}
      {!error && !caption && !live && <p style={{ margin: "14px 6px 0", fontSize: 13.5, lineHeight: 1.6, color: "var(--jood-ink-muted)", textAlign: "center" }}>{c.hint}</p>}

      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 }}>
          {chips.map((k) => k.href
            ? <a key={k.href} href={k.href} target="_blank" rel="noopener noreferrer" style={chip(true)}>{k.label} →</a>
            : <span key={k.label} style={chip(false)}>✓ {k.label}</span>)}
        </div>
      )}

      <div style={{ marginTop: 22, textAlign: "center" }}>
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
