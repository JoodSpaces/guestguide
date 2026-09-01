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

const SECTION_ICONS: Record<string, string> = {
  wifi: "⚡", internet: "⚡", network: "⚡",
  checkout: "⬆", departure: "⬆", "check-out": "⬆",
  kitchen: "🍳", appliances: "🍳", cooking: "🍳",
  ac: "❄", cooling: "❄", climate: "❄",
  pool: "🌊", outdoor: "🌊", garden: "🌊",
  parking: "🚘", car: "🚘",
  rules: "📋", house: "📋", policy: "📋",
  emergency: "🚨", safety: "🚨",
};
function sectionIcon(section: string) {
  const low = section.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (low.includes(key)) return icon;
  }
  return "·";
}

/* Render body text: treat double newlines as paragraphs, single as <br> */
function EntryBody({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: 0, lineHeight: 1.7, color: "var(--jood-ink-muted)", fontSize: "14.5px" }}>
          {p.split("\n").map((line, j) => (
            <span key={j}>{j > 0 && <br />}{line}</span>
          ))}
        </p>
      ))}
    </div>
  );
}

export function ManualClient({ entries, wifiSsid, wifiPassword, locale, token }: Props) {
  const t = useTranslations("manual");
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  /* Sections list */
  const sections = useMemo(() => {
    const seen = new Set<string>();
    return entries.reduce<string[]>((acc, e) => {
      if (!seen.has(e.section)) { seen.add(e.section); acc.push(e.section); }
      return acc;
    }, []);
  }, [entries]);

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
        if (data.entryIds.length) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            data.entryIds.forEach((id) => next.add(id));
            return next;
          });
        }
      } catch {
        /* silent */
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
    if (trimmed.length >= 8 && keywordFiltered.length < 2) {
      aiTimer.current = setTimeout(() => runAiSearch(trimmed), 600);
    }
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
  }, [query, keywordFiltered.length, runAiSearch]);

  const toggleEntry = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const copyWifi = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  const jumpToSection = (sec: string) => {
    setActiveSection(sec);
    const el = sectionRefs.current[sec];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const displayEntries = useMemo(() => {
    if (!aiResult?.entryIds.length) return keywordFiltered;
    const aiSet = new Set(aiResult.entryIds);
    const aiEntries = entries.filter((e) => aiSet.has(e.id));
    const rest = keywordFiltered.filter((e) => !aiSet.has(e.id));
    return [...aiEntries, ...rest];
  }, [keywordFiltered, aiResult, entries]);

  const isSearching = !!query.trim();
  const grouped = useMemo(() => {
    if (isSearching) return null;
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (!map.has(entry.section)) map.set(entry.section, []);
      map.get(entry.section)!.push(entry);
    }
    return map;
  }, [entries, isSearching]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--jood-ink-muted)", marginBottom: "6px" }}>
          {isAr ? "المسكن" : "Your Stay"}
        </p>
        <h1 className="font-display animate-reveal" style={{ fontSize: "clamp(1.75rem, 6vw, 2.5rem)", fontWeight: 600, color: "var(--jood-ink)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
          {t("title")}
        </h1>

        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "ابحث أو اسأل سؤالاً…" : "Search or ask a question…"}
            style={{
              width: "100%",
              padding: "10px 18px 10px 42px",
              borderRadius: "var(--radius-pill)",
              border: `1px solid ${aiResult ? "var(--jood-aqua)" : "var(--jood-line)"}`,
              backgroundColor: "var(--jood-surface)",
              color: "var(--jood-ink)",
              fontSize: "15px",
              fontFamily: "var(--font-body)",
              boxSizing: "border-box",
              boxShadow: "var(--shadow-card)",
              transition: "border-color 200ms",
            }}
            dir={isAr ? "rtl" : "ltr"}
          />
          <span style={{ position: "absolute", insetInlineStart: "16px", top: "50%", transform: "translateY(-50%)", color: aiSearching ? "var(--jood-accent)" : "var(--jood-ink-muted)", pointerEvents: "none", fontSize: "15px" }}>
            {aiSearching ? "✦" : "⌕"}
          </span>
        </div>
      </div>

      {/* ── Section chips (shown when not searching) ── */}
      {!isSearching && sections.length > 1 && (
        <div style={{ marginLeft: "-24px", marginRight: "-24px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", marginBottom: "28px" } as React.CSSProperties}>
          <div style={{ display: "flex", gap: "6px", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "4px" }}>
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => jumpToSection(sec)}
                style={{
                  flexShrink: 0,
                  background: activeSection === sec ? "var(--jood-ink)" : "var(--jood-surface)",
                  border: "1px solid var(--jood-line)",
                  color: activeSection === sec ? "var(--jood-ground)" : "var(--jood-ink-muted)",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "12px",
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  whiteSpace: "nowrap",
                  boxShadow: "var(--shadow-card)",
                  transition: "all 150ms",
                }}
              >
                {sectionIcon(sec)} {sec}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── AI answer card ── */}
      {aiResult?.answer && (
        <div style={{ background: "var(--jood-surface)", border: "1px solid var(--jood-aqua)", borderRadius: "var(--radius-lg)", padding: "18px 20px", marginBottom: "20px", animation: "cc-rise 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
          <style>{`@keyframes cc-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--jood-aqua)", marginBottom: "10px" }}>
            ✦ {isAr ? "JOOD ذكاء" : "JOOD AI"}
          </p>
          <p style={{ fontSize: "15px", color: "var(--jood-ink)", lineHeight: 1.65, margin: 0 }}>
            {aiResult.answer}
          </p>
          {aiResult.entryIds.length > 0 && (
            <p style={{ fontSize: "12px", color: "var(--jood-ink-muted)", marginTop: "10px" }}>
              {isAr ? "↓ الأقسام ذات الصلة أدناه" : "↓ Relevant sections below"}
            </p>
          )}
        </div>
      )}

      {aiResult && !aiResult.answer && aiResult.entryIds.length === 0 && (
        <p style={{ color: "var(--jood-ink-muted)", fontSize: "14px", marginBottom: "16px" }}>
          {isAr ? "لم أجد إجابة في الدليل. جرّب التواصل مع فريق جود." : "Couldn't find that in the manual. Try reaching the JOOD team."}
        </p>
      )}

      {/* ── Wi-Fi card ── */}
      {wifiSsid && (
        <div style={{ background: "var(--jood-ink)", borderRadius: "var(--radius-lg)", padding: "20px 22px", marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,244,237,0.4)", marginBottom: "6px" }}>
              {isAr ? "الواي فاي" : "Wi-Fi"}
            </p>
            <p style={{ color: "rgba(245,244,237,0.9)", fontWeight: 500, fontSize: "15px", margin: "0 0 3px" }}>{wifiSsid}</p>
            {wifiPassword && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "rgba(245,244,237,0.5)", letterSpacing: "0.05em", margin: 0 }}>{wifiPassword}</p>
            )}
          </div>
          {wifiPassword && (
            <button
              onClick={() => copyWifi(wifiPassword)}
              style={{
                flexShrink: 0,
                background: copiedWifi ? "var(--jood-accent)" : "rgba(245,244,237,0.10)",
                border: "1px solid rgba(245,244,237,0.15)",
                color: copiedWifi ? "#fff" : "rgba(245,244,237,0.7)",
                borderRadius: "var(--radius-pill)",
                fontSize: "11px",
                fontFamily: "var(--font-label)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "8px 16px",
                cursor: "pointer",
                transition: "all 200ms",
              }}
            >
              {copiedWifi ? (isAr ? "تم ✓" : "Copied ✓") : (isAr ? "نسخ" : "Copy")}
            </button>
          )}
        </div>
      )}

      {/* ── Search results ── */}
      {isSearching && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {displayEntries.length === 0 && !aiResult && !aiSearching && (
            <p style={{ color: "var(--jood-ink-muted)", padding: "16px 0", fontSize: "14px" }}>
              {isAr ? "لا توجد نتائج" : "No results"}
            </p>
          )}
          {displayEntries.map((entry, idx) => (
            <EntryRow key={entry.id} entry={entry} isAr={isAr} isOpen={expandedIds.has(entry.id)} onToggle={() => toggleEntry(entry.id)} isAiMatch={!!aiResult?.entryIds.includes(entry.id)} isLast={idx === displayEntries.length - 1} />
          ))}
        </div>
      )}

      {/* ── Grouped sections ── */}
      {!isSearching && grouped && (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {sections.map((sec) => {
            const secEntries = grouped.get(sec) ?? [];
            return (
              <section
                key={sec}
                ref={(el) => { sectionRefs.current[sec] = el; }}
              >
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "16px" }}>{sectionIcon(sec)}</span>
                  <p style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: "var(--jood-ink)", margin: 0 }}>
                    {sec}
                  </p>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--jood-accent)", background: "rgba(255,96,55,0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                    {secEntries.length}
                  </span>
                </div>

                {/* Accordion entries */}
                <div style={{ background: "var(--jood-surface)", border: "1px solid var(--jood-line)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
                  {secEntries.map((entry, idx) => (
                    <EntryRow key={entry.id} entry={entry} isAr={isAr} isOpen={expandedIds.has(entry.id)} onToggle={() => toggleEntry(entry.id)} isAiMatch={false} isLast={idx === secEntries.length - 1} inGroup />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Entry row (reused for search + grouped modes) ─────────── */
function EntryRow({ entry, isAr, isOpen, onToggle, isAiMatch, isLast, inGroup }: {
  entry: Entry; isAr: boolean; isOpen: boolean; onToggle: () => void; isAiMatch: boolean; isLast: boolean; inGroup?: boolean;
}) {
  const title = isAr ? entry.title_ar : entry.title_en;
  const body  = isAr ? entry.body_ar  : entry.body_en;

  const wrapStyle = inGroup ? {} : {
    background: "var(--jood-surface)",
    border: `1px solid ${isAiMatch ? "var(--jood-aqua)" : "var(--jood-line)"}`,
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    marginBottom: isLast ? 0 : "8px",
    boxShadow: "var(--shadow-card)",
    transition: "border-color 200ms",
  };

  return (
    <div style={wrapStyle}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "16px 20px",
          background: "none",
          border: "none",
          borderBottom: inGroup && !isLast ? "1px solid var(--jood-line)" : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          textAlign: isAr ? "right" : "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          {isAiMatch && <span style={{ fontSize: "10px", color: "var(--jood-aqua)", flexShrink: 0 }}>✦</span>}
          <span style={{ fontWeight: 500, color: "var(--jood-ink)", fontSize: "14.5px", lineHeight: 1.3 }}>{title}</span>
        </span>
        <span style={{
          color: "var(--jood-ink-faint)",
          flexShrink: 0,
          transition: "transform 300ms var(--ease-standard)",
          transform: isOpen ? "rotate(180deg)" : "none",
          display: "inline-block",
          fontSize: "14px",
        }}>
          ↓
        </span>
      </button>

      <div style={{
        display: "grid",
        gridTemplateRows: isOpen ? "1fr" : "0fr",
        transition: "grid-template-rows 360ms var(--ease-standard)",
      }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px 20px", borderTop: "1px solid var(--jood-line)" }}>
            <EntryBody text={body} />
          </div>
        </div>
      </div>
    </div>
  );
}
