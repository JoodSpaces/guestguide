import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The building blocks of the app look (white screen, cream panels, JOOD ink hero). Plain server-safe components that only
 * render classes defined in globals.css ("app look" block), so a screen reads the same wherever it is used.
 */

export type Tone = "neutral" | "info" | "ok" | "warn" | "danger";

/** Maps the old per-screen status colours to the five states, so a screen that still names a colour shows the standard chip. */
export function toneOfColor(c: string | undefined): Tone {
  if (!c) return "neutral";
  if (c.includes("danger")) return "danger";
  if (c.includes("accent")) return "warn";
  if (c.includes("success")) return "ok";
  if (c.includes("aqua") || c.includes("info")) return "info";
  return "neutral";
}

/** A state chip: orange asks for attention, aqua is calm, green is done, red is only late or error. */
export function State({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`app-state ${tone}`}>{children}</span>;
}

/** The dark ink card at the top of a screen: a small label, one big number or line, a pill in the corner, and up to two pill buttons with icons. */
export function Hero({ label, value, note, corner, actions }: {
  label: string; value: ReactNode; note?: ReactNode; corner?: { href: string; label: string };
  actions?: { href: string; label: string; icon?: ReactNode }[];
}) {
  return (
    <section className="app-hero">
      <div className="app-hero-top">
        <div style={{ minWidth: 0 }}>
          <p className="app-hero-label">{label}</p>
          <p className="app-hero-value">{value}</p>
        </div>
        {corner && <Link href={corner.href} className="app-hero-corner">{corner.label}</Link>}
      </div>
      {note && <p className="app-hero-note">{note}</p>}
      {actions && actions.length > 0 && (
        <div className="app-hero-actions">
          {actions.map((a) => (
            <Link key={a.href + a.label} href={a.href} className="app-hero-btn">{a.icon}{a.label}</Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** A section title with an optional link at the end ("Current stays          See all"). */
export function SectionHead({ title, count, href, hrefLabel = "See all" }: { title: string; count?: number; href?: string; hrefLabel?: string }) {
  return (
    <div className="app-sechead">
      <h2>{title}{typeof count === "number" && <span className={count > 0 ? "app-count on" : "app-count"}>{count}</span>}</h2>
      {href && <Link href={href}>{hrefLabel}</Link>}
    </div>
  );
}

/** Steps on a line: filled ink dots for what is done, the open one ringed. `at` is the index of the open step. */
export function StepLine({ steps, at }: { steps: { label: string; sub?: string }[]; at: number }) {
  return (
    <div className="app-steps" role="list">
      {steps.map((s, i) => (
        <div key={s.label} role="listitem" className={`app-step${i < at ? " done" : i === at ? " on" : ""}`}>
          <i aria-hidden>{i <= at ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.2 2.2L9.5 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}</i>
          <b>{s.label}</b>
          {s.sub && <small>{s.sub}</small>}
        </div>
      ))}
    </div>
  );
}

/** A cream card for one record: a small id line and a state at the top, two columns of label/value, optional steps. */
export function RecordCard({ href, kicker, state, cols, children }: {
  href?: string; kicker: string; state?: ReactNode; cols?: { label: string; value: ReactNode }[]; children?: ReactNode;
}) {
  const body = (
    <>
      <div className="app-rc-top">
        <span className="app-rc-kicker">{kicker}</span>
        {state}
      </div>
      {cols && (
        <div className="app-rc-cols">
          {cols.map((c) => (
            <div key={c.label}><small>{c.label}</small><b>{c.value}</b></div>
          ))}
        </div>
      )}
      {children}
    </>
  );
  return href ? <Link href={href} className="app-rc">{body}</Link> : <div className="app-rc">{body}</div>;
}

/** A search field as a pill with a round ink button at its end. GET form, so it works without script. */
export function SearchPill({ action, name = "q", placeholder, defaultValue }: { action: string; name?: string; placeholder: string; defaultValue?: string }) {
  return (
    <form action={action} method="get" className="app-search" role="search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} aria-label={placeholder} />
      <button type="submit" aria-label="Search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 7h16M7 12h10M10 17h4" /></svg></button>
    </form>
  );
}

/** A cream panel with a title row and white rows inside it, the "details" box. */
export function DetailsPanel({ title, icon, rows }: { title: string; icon?: ReactNode; rows: { label: string; value: ReactNode }[] }) {
  return (
    <section className="app-details">
      <p className="app-details-title">{icon}{title}</p>
      <dl>
        {rows.map((r) => (
          <div key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
        ))}
      </dl>
    </section>
  );
}

/** A quiet empty state with a way forward. */
export function Empty({ text, href, hrefLabel }: { text: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="app-empty">
      <p>{text}</p>
      {href && <Link href={href}>{hrefLabel}</Link>}
    </div>
  );
}

/** The head of a detail page, as in the reference: a round back button, the page word in the middle, an optional action at the end. */
export function DetailHead({ back, title = "Details", right }: { back: string; title?: string; right?: ReactNode }) {
  return (
    <div className="app-dhead">
      <Link href={back} aria-label="Back" className="app-roundbtn">←</Link>
      <p>{title}</p>
      <div>{right}</div>
    </div>
  );
}

/** A record's id line: an icon tile, a small label, the id in bold, and the state chip at the end. */
export function IdRow({ label, id, state, icon }: { label: string; id: ReactNode; state?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="app-idrow">
      <span className="app-idicon" aria-hidden>{icon ?? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>}</span>
      <div><small>{label}</small><b>{id}</b></div>
      {state}
    </div>
  );
}

/** A person row: round photo or initials, name and role, and round action buttons (message, call). */
export function ContactRow({ name, role, actions }: { name: string; role?: string; actions?: { href: string; label: string; icon: ReactNode; strong?: boolean }[] }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="app-contact">
      <span className="app-avatar" aria-hidden>{initials}</span>
      <div><b>{name}</b>{role && <small>{role}</small>}</div>
      <div className="app-contact-actions">
        {actions?.map((a) => (
          <a key={a.label} href={a.href} aria-label={a.label} className={a.strong ? "strong" : ""}>{a.icon}</a>
        ))}
      </div>
    </div>
  );
}

/** A history list: the time and date on the left, a check dot on a line, what happened on the right. Newest first. */
export function Timeline({ items }: { items: { time: string; date?: string; text: ReactNode }[] }) {
  return (
    <section className="app-timeline">
      <div className="app-grab" aria-hidden />
      <ol>
        {items.map((it, i) => (
          <li key={i}>
            <span className="app-tl-time"><b>{it.time}</b>{it.date && <small>{it.date}</small>}</span>
            <i aria-hidden><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.2 2.2L9.5 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></i>
            <span className="app-tl-text">{it.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
