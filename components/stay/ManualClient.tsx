"use client";

import { useState, useMemo } from "react";
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

interface Props {
  entries: Entry[];
  wifiSsid: string | null;
  wifiPassword: string | null;
  locale: string;
}

export function ManualClient({ entries, wifiSsid, wifiPassword, locale }: Props) {
  const t = useTranslations("manual");
  const isAr = locale === "ar";
  const [query, setQuery] = useState("");
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter((e) =>
      e.title_en.toLowerCase().includes(q) ||
      e.title_ar.toLowerCase().includes(q) ||
      e.body_en.toLowerCase().includes(q) ||
      e.body_ar.toLowerCase().includes(q)
    );
  }, [entries, query]);

  const copyWifi = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedWifi(true);
    setTimeout(() => setCopiedWifi(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Page heading */}
      <h1
        className="font-display animate-reveal"
        style={{
          fontSize: "clamp(1.8rem, 5vw, 2.6rem)",
          color: "var(--jood-ink)",
          marginBottom: "4px",
        }}
      >
        {t("title")}
      </h1>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "8px" }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_placeholder")}
          style={{
            width: "100%",
            padding: "10px 16px 10px 40px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--jood-line)",
            backgroundColor: "var(--jood-surface)",
            color: "var(--jood-ink)",
            fontSize: "0.9375rem",
            boxSizing: "border-box",
          }}
          dir={isAr ? "rtl" : "ltr"}
        />
        <span
          style={{
            position: "absolute",
            insetInlineStart: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--jood-ink-muted)",
            pointerEvents: "none",
          }}
        >
          ⌕
        </span>
      </div>

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
              <span
                className="font-mono"
                style={{ color: "var(--jood-ink-muted)", fontSize: "0.9375rem" }}
              >
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

      {/* Manual entries */}
      {filtered.length === 0 && query && (
        <p style={{ color: "var(--jood-ink-muted)", padding: "16px 0" }}>
          {isAr ? "لا توجد نتائج" : "No results"}
        </p>
      )}

      {filtered.map((entry) => {
        const title = isAr ? entry.title_ar : entry.title_en;
        const body = isAr ? entry.body_ar : entry.body_en;
        const isOpen = expandedId === entry.id;

        return (
          <div
            key={entry.id}
            style={{
              backgroundColor: "var(--jood-surface)",
              border: "1px solid var(--jood-line)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setExpandedId(isOpen ? null : entry.id)}
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
              <span style={{ fontWeight: 500, color: "var(--jood-ink)", fontSize: "0.9375rem" }}>
                {title || (isAr ? entry.title_ar : entry.title_en)}
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

            {/* Animated accordion — grid trick avoids max-height hack */}
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
