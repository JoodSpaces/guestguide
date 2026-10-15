import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The building blocks of the app look (white screen, cream panels, JOOD ink hero). Plain server-safe components that only
 * render classes defined in globals.css ("app look" block), so a screen reads the same wherever it is used.
 */

export type Tone = "neutral" | "info" | "ok" | "warn" | "danger";

/** A state chip: orange asks for attention, aqua is calm, green is done, red is only late or error. */
export function State({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`app-state ${tone}`}>{children}</span>;
}

/** The dark ink card at the top of a screen: a small label, one big number or line, and up to two pill buttons. */
export function Hero({ label, value, note, actions }: {
  label: string; value: ReactNode; note?: ReactNode; actions?: { href: string; label: string; icon?: ReactNode }[];
}) {
  return (
    <section className="app-hero">
      <p className="app-hero-label">{label}</p>
      <p className="app-hero-value">{value}</p>
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
