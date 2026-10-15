"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppIcon } from "@/components/ui/AppIcon";
import { haptic } from "@/lib/haptics";

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
  wifi: "wifi", internet: "wifi", network: "wifi",
  checkout: "departure", departure: "departure", "check-out": "departure",
  kitchen: "kitchen", appliances: "kitchen", cooking: "kitchen",
  ac: "ac", cooling: "ac", climate: "ac",
  pool: "pool", outdoor: "pool", garden: "pool",
  parking: "parking", car: "parking",
  rules: "rules", house: "rules", policy: "rules",
  emergency: "emergency", safety: "emergency",
};
function sectionIcon(section: string): string | null {
  const low = section.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (low.includes(key)) return icon;
  }
  return null;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    haptic("success");
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

  const PALETTE: [string, string][] = [["#16E0B0", "#0A6E6A"], ["#5B7BFF", "#2B2FB0"], ["#FF8A2A", "#B8321A"], ["#FF3FA4", "#7A1FA8"], ["#9BD6E0", "#2B6C86"], ["#FFD35B", "#B8721A"]];
  const [openSec, setOpenSec] = useState<string | null>(null);
  const secEntries = openSec && grouped ? grouped.get(openSec) ?? [] : [];
  const secIndex = openSec ? sections.indexOf(openSec) : 0;
  const glow = (i: number) => ({ "--c1": PALETTE[i % PALETTE.length][0], "--c2": PALETTE[i % PALETTE.length][1] }) as React.CSSProperties;

  return (
    <div className="man" dir={isAr ? "rtl" : "ltr"}>
      {/* Search, as a pill */}
      <div className="man-search">
        <AppIcon name={aiSearching ? "ai" : "search"} size={18} />
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (e.target.value) setOpenSec(null); }}
          placeholder={isAr ? "ابحث أو اسأل سؤالاً…" : "Search or ask a question…"}
          aria-label={isAr ? "ابحث في الدليل" : "Search the guide"}
        />
      </div>

      {/* AI answer */}
      {aiResult?.answer && (
        <div className="home-note" style={{ marginTop: 12 }}>
          <small><AppIcon name="ai" size={12} style={{ marginInlineEnd: 6, verticalAlign: "-2px" }} />{isAr ? "JOOD ذكاء" : "JOOD AI"}</small>
          <p>{aiResult.answer}</p>
          {aiResult.entryIds.length > 0 && <small style={{ marginTop: 8 }}>{isAr ? "↓ الأقسام ذات الصلة أدناه" : "↓ Relevant sections below"}</small>}
        </div>
      )}
      {aiResult && !aiResult.answer && aiResult.entryIds.length === 0 && (
        <p style={{ color: "var(--jood-ink-muted)", fontSize: 14, margin: "12px 4px 0" }}>
          {isAr ? "لم أجد إجابة في الدليل. جرّب التواصل مع فريق جود." : "Couldn't find that in the guide. Try reaching the JOOD team."}
        </p>
      )}

      {/* Wi-Fi: the thing everyone looks for first */}
      {wifiSsid && !isSearching && !openSec && (
        <div className="home-card wide" style={{ ...glow(0), marginTop: 12, marginBottom: 0 }}>
          <span style={{ minWidth: 0 }}>
            <small>{isAr ? "الواي فاي" : "Wi-Fi"}</small>
            <b style={{ overflowWrap: "anywhere" }}>{wifiSsid}</b>
            {wifiPassword && <small style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em", opacity: 1, fontSize: ".85rem", overflowWrap: "anywhere" }}>{wifiPassword}</small>}
          </span>
          {wifiPassword && (
            <button type="button" onClick={() => copyWifi(wifiPassword)} className="man-copy" aria-label={isAr ? "نسخ كلمة السر" : "Copy the password"}>
              {copiedWifi ? "✓" : (isAr ? "نسخ" : "Copy")}
            </button>
          )}
        </div>
      )}

      {/* Search results */}
      {isSearching && (
        <div style={{ marginTop: 12 }}>
          {displayEntries.length === 0 && !aiResult && !aiSearching && (
            <p style={{ color: "var(--jood-ink-muted)", padding: "16px 4px", fontSize: 14 }}>{isAr ? "لا توجد نتائج" : "No results"}</p>
          )}
          <div className="man-list">
            {displayEntries.map((entry, idx) => (
              <EntryRow key={entry.id} entry={entry} isAr={isAr} isOpen={expandedIds.has(entry.id)} onToggle={() => toggleEntry(entry.id)} isAiMatch={!!aiResult?.entryIds.includes(entry.id)} isLast={idx === displayEntries.length - 1} inGroup />
            ))}
          </div>
        </div>
      )}

      {/* Nothing written yet */}
      {!isSearching && entries.length === 0 && (
        <div className="home-note" style={{ marginTop: 12 }}>
          <p style={{ fontWeight: 600 }}>{isAr ? "دليل البيت قيد الإعداد." : "The house guide is still being written."}</p>
          <p style={{ color: "var(--jood-ink-muted)", fontSize: ".9rem" }}>{isAr ? "اسأل المساعد أو راسل الفريق وسنساعدك فوراً." : "Ask the concierge or message the team and we'll help right away."}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <Link href={`/s/${token}/concierge`} className="man-pill">{isAr ? "اسأل المساعد" : "Ask the concierge"}</Link>
            <Link href={`/s/${token}/requests`} className="man-pill">{isAr ? "تواصل مع الفريق" : "Contact the team"}</Link>
          </div>
        </div>
      )}

      {/* Sections as tiles; one opens into its entries */}
      {!isSearching && entries.length > 0 && !openSec && (
        <>
          <p className="man-label">{isAr ? "الأقسام" : "Sections"}</p>
          <div className="home-grid">
            {sections.map((sec, i) => (
              <button key={sec} type="button" className="home-card" style={{ ...glow(i + 1), textAlign: "start", border: 0, cursor: "pointer", font: "inherit" }} onClick={() => { setOpenSec(sec); setActiveSection(sec); }}>
                <span className="home-ic"><AppIcon name={sectionIcon(sec) ?? "book"} size={18} /></span>
                <span><b>{sec}</b><small>{(grouped?.get(sec) ?? []).length} {isAr ? "موضوع" : (grouped?.get(sec)?.length === 1 ? "topic" : "topics")}</small></span>
              </button>
            ))}
          </div>
        </>
      )}

      {!isSearching && openSec && (
        <>
          <button type="button" className="man-back" onClick={() => setOpenSec(null)}>
            <span aria-hidden>{isAr ? "→" : "←"}</span> {isAr ? "كل الأقسام" : "All sections"}
          </button>
          <div className="home-card wide" style={{ ...glow(secIndex + 1), marginBottom: 10 }}>
            <span><small>{(secEntries.length)} {isAr ? "موضوع" : "topics"}</small><b style={{ fontSize: "1.25rem" }}>{openSec}</b></span>
            <i aria-hidden><AppIcon name={sectionIcon(openSec) ?? "book"} size={20} /></i>
          </div>
          <div className="man-list">
            {secEntries.map((entry, idx) => (
              <EntryRow key={entry.id} entry={entry} isAr={isAr} isOpen={expandedIds.has(entry.id)} onToggle={() => toggleEntry(entry.id)} isAiMatch={false} isLast={idx === secEntries.length - 1} inGroup />
            ))}
          </div>
        </>
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
          {isAiMatch && <AppIcon name="ai" size={13} style={{ color: "var(--jood-aqua)" }} />}
          <span style={{ fontWeight: 500, color: "var(--jood-ink)", fontSize: "14.5px", lineHeight: 1.3 }}>{title}</span>
        </span>
        <span style={{
          color: "var(--jood-ink-subtle)",
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
