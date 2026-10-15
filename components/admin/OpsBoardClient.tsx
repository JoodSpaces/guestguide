"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, ClipboardCheck, Hourglass, PlayCircle, Plus, Sparkles, TriangleAlert, User, Wrench } from "lucide-react";
import { CreateTurnoverForm } from "@/components/admin/CreateTurnoverForm";
import { State, type Tone } from "@/components/app/ui";

export interface OpsTask {
  id: string;
  status: "scheduled" | "pending" | "in_progress" | "ready" | "approved";
  assignedTo: string | null;
  createdAt: string;
  approvedAt: string | null;
  house: string;
  guest: string | null;
  checkOut: string | null;
}
export interface OpsTicket { id: string; title: string; priority: string; status: string; createdAt: string; house: string }

interface Props {
  tasks: OpsTask[];
  done: OpsTask[];
  tickets: OpsTicket[];
  properties: { id: string; name: string }[];
  teamMembers: { id: string; name: string; role: string }[];
  role: string;
  myName: string;
  failed: string[];   // what could not be read, named on the page
}

type Tab = "mine" | "active" | "upcoming" | "tickets" | "done";

const LABEL: Record<OpsTask["status"], string> = {
  scheduled: "Upcoming", pending: "Ready to start", in_progress: "In progress", ready: "To approve", approved: "Done",
};
const TONE: Record<OpsTask["status"], Tone> = { scheduled: "info", pending: "neutral", in_progress: "warn", ready: "ok", approved: "ok" };
const STEP: Record<OpsTask["status"], number> = { scheduled: 0, pending: 0, in_progress: 1, ready: 2, approved: 3 };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Cairo", day: "numeric", month: "short" });
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function OpsBoardClient({ tasks, done, tickets, properties, teamMembers, role, myName, failed }: Props) {
  const mine = tasks.filter((t) => myName && t.assignedTo === myName);
  const active = tasks.filter((t) => t.status !== "scheduled");
  const upcoming = tasks.filter((t) => t.status === "scheduled");
  const canSeeTickets = role === "admin" || role === "ops" || role === "maintenance";
  const canAdd = role === "admin" || role === "ops";

  const toStart = tasks.filter((t) => t.status === "pending").length;
  const going = tasks.filter((t) => t.status === "in_progress").length;
  const toApprove = tasks.filter((t) => t.status === "ready").length;
  const urgent = tickets.filter((t) => t.priority === "urgent").length;
  const live = toStart + going + toApprove;
  const pct = live ? Math.round((toApprove / live) * 100) : null;

  const verdict = urgent > 0 ? { text: `${urgent} urgent ticket${urgent > 1 ? "s" : ""}`, tone: "danger" as const }
    : toApprove > 0 ? { text: `${toApprove} to approve`, tone: "warn" as const }
    : live > 0 ? { text: "Work in progress", tone: "neutral" as const }
    : { text: "All clear", tone: "ok" as const };
  const ringColor = verdict.tone === "danger" ? "var(--jood-danger)" : verdict.tone === "warn" ? "var(--jood-accent)" : "var(--jood-success)";
  const R = 52, C = 2 * Math.PI * R;

  const [tab, setTab] = useState<Tab>(mine.length > 0 ? "mine" : "active");
  const list = tab === "mine" ? mine : tab === "active" ? active : tab === "upcoming" ? upcoming : tab === "done" ? done : [];

  const pills: { id: Tab; label: string; n: number }[] = [
    ...(myName ? [{ id: "mine" as Tab, label: "Mine", n: mine.length }] : []),
    { id: "active", label: "Active", n: active.length },
    { id: "upcoming", label: "Upcoming", n: upcoming.length },
    ...(canSeeTickets ? [{ id: "tickets" as Tab, label: "Tickets", n: tickets.length }] : []),
    { id: "done", label: "Done", n: done.length },
  ];

  return (
    <div className="inv-page">
      <h1 style={{ margin: "0 2px 16px" }}>Operations</h1>

      {failed.length > 0 && (
        <p role="alert" style={{ background: "rgba(255,96,55,.12)", color: "#A8431F", borderRadius: 14, padding: "10px 14px", fontSize: ".85rem", margin: "0 0 14px" }}>
          Could not read: {failed.join(", ")}. What you see may be incomplete.
        </p>
      )}

      {/* The day at a glance: how far the work is, and what waits for whom */}
      <section className="inv-health">
        <div className="inv-verdict"><span>Operations</span><b className={verdict.tone}>{verdict.text}</b></div>
        <div className="inv-sheet">
          <div className="inv-ring">
            <svg viewBox="0 0 120 120" width="150" height="150" aria-hidden>
              <circle cx="60" cy="60" r={R - 8} fill={ringColor} opacity="0.09" />
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(53,30,28,.07)" strokeWidth="5" />
              {pct !== null && (
                <circle cx="60" cy="60" r={R} fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 60 60)" style={{ transition: "stroke-dasharray 600ms ease" }} />
              )}
            </svg>
            <div><b style={{ color: ringColor }}>{pct === null ? "–" : `${pct}%`}</b><small>{pct === null ? "no cleanings now" : "cleaned, waiting for approval"}</small></div>
          </div>
          <div className="inv-tiles">
            <div><span className="ic info"><Hourglass size={18} strokeWidth={1.8} /></span><b>{toStart}</b><small>To start</small></div>
            <div><span className="ic warn"><PlayCircle size={18} strokeWidth={1.8} /></span><b>{going}</b><small>In progress</small></div>
            <div><span className="ic ok"><ClipboardCheck size={18} strokeWidth={1.8} /></span><b>{toApprove}</b><small>To approve</small></div>
            <div><span className={`ic ${urgent > 0 ? "danger" : "info"}`}><Wrench size={18} strokeWidth={1.8} /></span><b>{tickets.length}</b><small>Open tickets</small></div>
          </div>
        </div>
      </section>

      {/* Actions */}
      {canAdd && (
        <div className="ops-actions">
          <CreateTurnoverForm properties={properties} teamMembers={teamMembers} />
          <Link href="/admin/ops/maintenance/new" className="ops-ticket"><Plus size={16} strokeWidth={2} /> Ticket</Link>
        </div>
      )}

      {/* Filters */}
      <div className="inv-pills" role="tablist" aria-label="Show">
        {pills.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={tab === p.id} onClick={() => setTab(p.id)}>{p.label} <span>{p.n}</span></button>
        ))}
      </div>

      {tab !== "tickets" && list.length === 0 && (
        <p className="app-empty">
          {tab === "mine" ? "Nothing is assigned to you." : tab === "active" ? "No cleaning is in progress or waiting." : tab === "upcoming" ? "No cleanings are scheduled yet." : "Nothing has been approved yet."}
        </p>
      )}
      {tab === "tickets" && tickets.length === 0 && <p className="app-empty">No open maintenance tickets. Everything is fixed.</p>}

      <div className="inv-grid">
        {tab !== "tickets" && list.map((t) => (
          <Link key={t.id} href={`/admin/ops/turnover/${t.id}`} className="inv-card ops-card">
            <div className="inv-card-top">
              <span className="ic"><Sparkles size={16} strokeWidth={1.8} /></span>
              <State tone={TONE[t.status]}>{LABEL[t.status]}</State>
            </div>
            <b className="inv-name">{t.house}</b>
            <small className="inv-sub">
              {t.guest ? `After ${t.guest}${t.checkOut ? ` · out ${day(t.checkOut)}` : ""}` : `Added by hand · ${day(t.createdAt)}`}
            </small>
            <div className="ops-dots" aria-label={`Step ${STEP[t.status] + 1} of 4`}>
              {[0, 1, 2, 3].map((i) => <i key={i} className={i < STEP[t.status] ? "done" : i === STEP[t.status] ? "on" : ""} />)}
            </div>
            <div className="ops-who">
              {t.assignedTo ? (<><span className="app-avatar" aria-hidden>{initials(t.assignedTo)}</span>{t.assignedTo === myName ? "You" : t.assignedTo}</>) : (<><User size={14} strokeWidth={1.8} />Unassigned</>)}
            </div>
          </Link>
        ))}

        {tab === "tickets" && tickets.map((t) => (
          <Link key={t.id} href={`/admin/ops/maintenance/${t.id}`} className="inv-card ops-card">
            <div className="inv-card-top">
              <span className="ic"><Wrench size={16} strokeWidth={1.8} /></span>
              <State tone={t.priority === "urgent" ? "danger" : "neutral"}>{t.priority === "urgent" ? "Urgent" : "Open"}</State>
            </div>
            <b className="inv-name">{t.title}</b>
            <small className="inv-sub">{t.house} · {day(t.createdAt)}</small>
          </Link>
        ))}
      </div>

      {/* Stock, one tap per house */}
      {properties.length > 0 && (
        <>
          <p className="ops-label"><Boxes size={14} strokeWidth={1.8} /> Stock by house</p>
          <div className="inv-pills" style={{ flexWrap: "wrap", overflow: "visible" }}>
            {properties.map((p) => (
              <Link key={p.id} href={`/admin/ops/inventory/${p.id}`} className="ops-house">{p.name}</Link>
            ))}
          </div>
        </>
      )}
      {role === "admin" && urgent > 0 && (
        <p className="ops-warn"><TriangleAlert size={14} strokeWidth={1.8} /> {urgent} urgent ticket{urgent > 1 ? "s" : ""} open. See Tickets above.</p>
      )}
    </div>
  );
}
