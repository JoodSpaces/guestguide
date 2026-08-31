"use client";

import { useState, useEffect, useRef } from "react";
import type { Phase } from "@/lib/token";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  error?: boolean;
}

interface Props {
  token: string;
  locale: string;
  phase: Phase;
  guestFirstName: string;
  propertyName: string;
}

function suggestedQuestions(phase: Phase, isAr: boolean): string[] {
  if (isAr) {
    if (phase === "arrival" || phase === "settling")
      return ["ما هي كلمة مرور الواي فاي؟", "كيف أدخل الوحدة؟", "في أي ساعة يجب المغادرة؟"];
    if (phase === "departure")
      return ["كيف أُسلّم الوحدة؟", "هل يمكنني تمديد وقت المغادرة؟", "أين أترك المفاتيح؟"];
    return ["ما هي كلمة مرور الواي فاي؟", "ما المطاعم القريبة؟", "كيف أستخدم المكيف؟"];
  }
  if (phase === "arrival" || phase === "settling")
    return ["What's the WiFi password?", "How do I get inside?", "What time is check-out?"];
  if (phase === "departure")
    return ["What's the checkout procedure?", "Can I get a late checkout?", "Where do I leave the keys?"];
  return ["What's the WiFi password?", "What's good for dinner nearby?", "How do I use the AC?"];
}

const WELCOME_EN = (name: string) =>
  `Hi ${name}! I'm JOOD Concierge — here to help with anything about your stay. Ask me about the property, WiFi, local spots, or anything else.`;
const WELCOME_AR = (name: string) =>
  `مرحباً ${name}! أنا كونسيرج جود — هنا لمساعدتك في كل ما يتعلق بإقامتك. اسألني عن العقار، الواي فاي، الأماكن المحلية، أو أي شيء آخر.`;

export function ConciergeClient({ token, locale, phase, guestFirstName, propertyName }: Props) {
  const isAr = locale === "ar";
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: isAr ? WELCOME_AR(guestFirstName) : WELCOME_EN(guestFirstName),
    },
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const allMessages = [...messages, userMsg];

    setMessages([...allMessages, { role: "assistant", content: "", streaming: true }]);
    setInput("");
    setStreaming(true);

    // Only send actual conversation (exclude the welcome assistant message from API context)
    const apiMessages = allMessages
      .filter((m) => !(m.role === "assistant" && m === messages[0]))
      .map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch("/api/guest/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, messages: apiMessages, locale }),
      });

      if (!res.ok || !res.body) throw new Error("fetch_failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.streaming) next[next.length - 1] = { ...last, content: snap };
          return next;
        });
      }

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.streaming) next[next.length - 1] = { ...last, streaming: false };
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.streaming) {
          next[next.length - 1] = {
            role: "assistant",
            content: isAr
              ? "عذراً، حدث خطأ. حاول مجدداً أو تواصل مع فريق جود."
              : "Sorry, something went wrong. Try again or reach the JOOD team.",
            error: true,
          };
        }
        return next;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const suggestions = suggestedQuestions(phase, isAr);
  const showSuggestions = messages.length === 1; // only on first load

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 120px)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          paddingBottom: "16px",
          marginBottom: "4px",
          borderBottom: "1px solid var(--jood-line)",
          flexShrink: 0,
        }}
      >
        {/* AI avatar */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--jood-aqua) 0%, var(--jood-accent) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          ✦
        </div>
        <div>
          <p style={{ fontWeight: 500, fontSize: "0.9375rem", color: "var(--jood-ink)" }}>
            {isAr ? "كونسيرج جود" : "JOOD Concierge"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "var(--jood-aqua)",
                display: "inline-block",
              }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--jood-ink-muted)" }}>
              {isAr ? `${propertyName} · مدعوم بالذكاء الاصطناعي` : `${propertyName} · AI-powered`}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 0",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div
                key={i}
                style={{ display: "flex", justifyContent: isAr ? "flex-start" : "flex-end", marginBottom: "6px" }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    backgroundColor: "var(--jood-ink)",
                    color: "var(--jood-ground)",
                    borderRadius: isAr
                      ? "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px"
                      : "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)",
                    padding: "12px 16px",
                    fontSize: "0.9375rem",
                    lineHeight: 1.6,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "8px",
                marginBottom: "6px",
                justifyContent: isAr ? "flex-end" : "flex-start",
              }}
            >
              {!isAr && (
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--jood-aqua) 0%, var(--jood-accent) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6rem",
                    flexShrink: 0,
                  }}
                >
                  ✦
                </div>
              )}
              <div style={{ maxWidth: "80%" }}>
                <div
                  style={{
                    backgroundColor: "var(--jood-surface)",
                    border: `1px solid ${msg.error ? "var(--jood-danger, #f87171)" : "var(--jood-line)"}`,
                    borderRadius: isAr
                      ? "var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)"
                      : "var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px",
                    padding: "12px 16px",
                    fontSize: "0.9375rem",
                    lineHeight: 1.65,
                    color: "var(--jood-ink)",
                    minHeight: msg.streaming && !msg.content ? "42px" : undefined,
                  }}
                >
                  {msg.content || (msg.streaming ? "" : "")}
                  {msg.streaming && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "2px",
                        height: "1em",
                        backgroundColor: "var(--jood-aqua)",
                        marginInlineStart: "2px",
                        verticalAlign: "text-bottom",
                        animation: "jood-blink 800ms step-start infinite",
                      }}
                    />
                  )}
                </div>
              </div>
              {isAr && (
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--jood-aqua) 0%, var(--jood-accent) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6rem",
                    flexShrink: 0,
                  }}
                >
                  ✦
                </div>
              )}
            </div>
          );
        })}

        {/* Suggested questions */}
        {showSuggestions && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "12px",
              justifyContent: isAr ? "flex-end" : "flex-start",
            }}
          >
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--jood-line)",
                  backgroundColor: "var(--jood-surface)",
                  color: "var(--jood-ink-muted)",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: isAr ? "right" : "left",
                  transition: "border-color 150ms, color 150ms",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Escalation hint */}
      <div
        style={{
          flexShrink: 0,
          paddingBottom: "6px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.72rem", color: "var(--jood-ink-ghost)", fontFamily: "var(--font-label)", letterSpacing: "0.06em" }}>
          {isAr ? "هل تحتاج مساعدة بشرية؟ " : "Need a human? "}
          <a
            href={`/s/${token}/requests`}
            style={{ color: "var(--jood-ink-muted)", textDecoration: "underline" }}
          >
            {isAr ? "تواصل مع فريق جود" : "Reach the JOOD team"}
          </a>
        </p>
      </div>

      {/* Input */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--jood-line)",
          paddingTop: "12px",
          backgroundColor: "var(--jood-ground)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isAr ? "اسألني أي شيء…" : "Ask me anything…"}
            rows={1}
            disabled={streaming}
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--jood-surface)",
              color: "var(--jood-ink)",
              fontSize: "0.9375rem",
              fontFamily: "inherit",
              resize: "none",
              direction: isAr ? "rtl" : "ltr",
              lineHeight: 1.5,
              opacity: streaming ? 0.6 : 1,
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: streaming || !input.trim()
                ? "var(--jood-line)"
                : "linear-gradient(135deg, var(--jood-aqua) 0%, var(--jood-accent) 100%)",
              border: "none",
              color: "white",
              cursor: streaming || !input.trim() ? "default" : "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 200ms",
            }}
          >
            {streaming ? "…" : (isAr ? "←" : "→")}
          </button>
        </div>
        <p
          style={{
            fontSize: "0.68rem",
            color: "var(--jood-ink-ghost)",
            marginTop: "6px",
            textAlign: isAr ? "right" : "left",
            fontFamily: "var(--font-label)",
            letterSpacing: "0.06em",
          }}
        >
          {isAr ? "Enter للإرسال · Shift+Enter لسطر جديد" : "Enter to send · Shift+Enter for new line"}
        </p>
      </div>
    </div>
  );
}
