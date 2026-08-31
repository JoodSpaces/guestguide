"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

interface Entry {
  id: string;
  section: string;
  sort_order: number;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
}

interface AiResult {
  answer: string | null;
  entryIds: string[];
}

interface Props {
  entries: Entry[];
  wifiSsid: string | null;
  wifiPassword: string | null;
  locale: string;
  token: string;
}

export function ManualClient({ entries, wifiSsid, wifiPassword, locale, token }: Props) {
  const t = useTranslations("manual");
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keywordFiltered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(
      (e) =>
        e.title_en.toLowerCase().includes(q) ||
        e.title_ar.toLowerCase().includes(q) ||
        e.body_en.toLowerCase().includes(q) ||
        e.body_ar.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const runAiSearch = useCallback(
    async (q: string) => {
      setAiSearching(true);
      setAiResult(null);
      try {
        const res = await fetch("/api/guest/manual-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, query: q, locale }),
        });
        if (!res.ok) return;
        const data: AiResult = await res.json();
        setAiResult(data);
        // Auto-expand matched entries
        if (data.entryIds.length) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            data.entryIds.forEach((id) => next.add(id));
            return next;
          });
        }
      } catch {
        // silent fail
      } finally {
        setAiSearching(false);
      }
    },
    [token, locale],
  );

  useEffect(() => {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    setAiResult(null);
    const trimmed = query.trim();
    // Trigger AI when query is long enough and keyword search gives < 2 results
    if (trimmed.length >= 8 && keywordFiltered.length < 2) {
      aiTimer.current = setTimeout(() => runAiSearch(trimmed), 600);
    }
    return () => {
      if (aiTimer.current) clearTimeout(aiTimer.current);
    };
  }, [query, keywordFiltered.length, runAiSearch]);

  const toggleEntry = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copyWifi = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  // When AI search has results, merge into display list (AI entries first, then rest)
  const displayEntries = useMemo(() => {
    if (!aiResult?.entryIds.length) return keywordFiltered;
    const aiSet = new Set(aiResult.entryIds);
    const aiEntries = entries.filter((e) => aiSet.has(e.id));
    const rest = keywordFiltered.filter((e) => !aiSet.has(e.id));
    return [...aiEntries, ...rest];
  }, [keywordFiltered, aiResult, entries]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Page heading */}
      <h1
        className="font-display animate-reveal"
        style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "var(--jood-ink)", marginBottom: "4px" }}
      >
        {t("title")}
      </h1>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "8px" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isAr ? "ابحث أو اسأل سؤالاً…" : "Search or ask a question…"}
          style={{
            width: "100%",
            padding: "10px 16px 10px 40px",
            borderRadius: "var(--radius-pill)",
            border: `1px solid ${aiResult ? "var(--jood-aqua)" : "var(--jood-line)"}`,
            backgroundColor: "var(--jood-surface)",
            color: "var(--jood-ink)",
            fontSize: "0.9375rem",
            boxSizing: "border-box",
            transition: "border-color 200ms",
          }}
          dir={isAr ? "rtl" : "ltr"}
        />
        <span
          style={{
            position: "absolute",
            insetInlineStart: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: aiSearching ? "var(--jood-accent)" : "var(--jood-ink-muted)",
            pointerEvents: "none",
            transition: "color 200ms",
          }}
        >
          {aiSearching ? "✦" : "⌕"}
        </span>
        {aiSearching && (
          <span
            style={{
              position: "absolute",
              insetInlineEnd: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.7rem",
              fontFamily: "var(--font-label)",
              letterSpacing: "0.1em",
              color: "var(--jood-ink-ghost)",
            }}
          >
            {isAr ? "جاري البحث…" : "Searching…"}
          </span>
        )}
      </div>

      {/* AI answer card */}
      {aiResult?.answer && (
        <div
          style={{
            backgroundColor: "var(--jood-surface)",
            border: "1px solid var(--jood-aqua)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                fontFamily: "var(--font-label)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--jood-aqua)",
              }}
            >
              ✦ {isAr ? "JOOD ذكاء" : "JOOD AI"}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "var(--jood-ink)",
              lineHeight: 1.65,
            }}
          >
            {aiResult.answer}
          </p>
          {aiResult.entryIds.length > 0 && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--jood-ink-muted)",
                marginTop: "10px",
                fontFamily: "var(--font-body)",
              }}
            >
              {isAr ? "↓ الأقسام ذات الصلة أدناه" : "↓ Relevant sections below"}
            </p>
          )}
        </div>
      )}

      {/* AI searched but found nothing */}
      {aiResult && !aiResult.answer && aiResult.entryIds.length === 0 && (
        <p style={{ color: "var(--jood-ink-muted)", padding: "4px 0", fontSize: "0.875rem" }}>
          {isAr
            ? "لم أجد إجابة في الدليل. جرّب التواصل مع فريق جود."
            : "Couldn't find that in the manual. Try reaching the JOOD team."}
        </p>
      )}

      {/* Wi-Fi card — always first */}
      {wifiSsid && (
        <div
          style={{
            backgroundColor: "var(--jood-surface)",
            border: "1px solid var(--jood-line)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
          }}
        >
          <p className="label-eyebrow" style={{ color: "var(--jood-ink-muted)", marginBottom: "10px" }}>
            {t("sections.wifi")}
          </p>
          <p style={{ fontWeight: 500, marginBottom: "4px" }}>{wifiSsid}</p>
          {wifiPassword && (
            <button
              onClick={() => copyWifi(wifiPassword)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span className="font-mono" style={{ color: "var(--jood-ink-muted)", fontSize: "0.9375rem" }}>
                {wifiPassword}
              </span>
              <span
                style={{
                  color: copiedWifi ? "var(--jood-accent)" : "var(--jood-ink-muted)",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-label)",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  transition: "color 200ms var(--ease-standard)",
                }}
              >
                {copiedWifi ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ" : "Copy")}
              </span>
            </button>
          )}
        </div>
      )}

      {/* No keyword results (before AI fires) */}
      {displayEntries.length === 0 && query && !aiResult && !aiSearching && (
        <p style={{ color: "var(--jood-ink-muted)", padding: "16px 0" }}>
          {isAr ? "لا توجد نتائج" : "No results"}
        </p>
      )}

      {/* Manual entries */}
      {displayEntries.map((entry) => {
        const title = isAr ? entry.title_ar : entry.title_en;
        const body = isAr ? entry.body_ar : entry.body_en;
        const isOpen = expandedIds.has(entry.id);
        const isAiMatch = aiResult?.entryIds.includes(entry.id);

        return (
          <div
            key={entry.id}
            style={{
              backgroundColor: "var(--jood-surface)",
              border: `1px solid ${isAiMatch ? "var(--jood-aqua)" : "var(--jood-line)"}`,
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              transition: "border-color 200ms",
            }}
          >
            <button
              onClick={() => toggleEntry(entry.id)}
              style={{
                width: "100%",
                padding: "18px 24px",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                textAlign: isAr ? "right" : "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                {isAiMatch && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontFamily: "var(--font-label)",
                      letterSpacing: "0.1em",
                      color: "var(--jood-aqua)",
                      flexShrink: 0,
                    }}
                  >
                    ✦
                  </span>
                )}
                <span style={{ fontWeight: 500, color: "var(--jood-ink)", fontSize: "0.9375rem" }}>
                  {title}
                </span>
              </span>
              <span
                style={{
                  color: "var(--jood-ink-muted)",
                  flexShrink: 0,
                  transition: "transform 300ms var(--ease-standard)",
                  transform: isOpen ? "rotate(180deg)" : "none",
                  display: "inline-block",
                }}
              >
                ↓
              </span>
            </button>

            {/* Animated accordion */}
            <div
              style={{
                display: "grid",
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transition: "grid-template-rows 380ms var(--ease-standard)",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    padding: "16px 24px 20px",
                    color: "var(--jood-ink-muted)",
                    fontSize: "0.9375rem",
                    lineHeight: 1.7,
                    borderTop: "1px solid var(--jood-line)",
                  }}
                >
                  {body}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
