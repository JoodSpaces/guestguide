"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/admin/Toaster";

/** Closes one inventory alert. The alert can come back if the cause does (a new damage report, stock below the level). */
export function DismissAlertButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    setBusy(true);
    const res = await fetch(`/api/admin/ops/inventory/alerts/${id}`, { method: "PATCH" }).catch(() => null);
    setBusy(false);
    if (res?.ok) { toast("Alert dismissed"); router.refresh(); }
    else toast("Could not dismiss the alert. Try again.", "error");
  }

  return (
    <button
      onClick={dismiss}
      disabled={busy}
      aria-label="Dismiss this alert"
      style={{
        flexShrink: 0, padding: "6px 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--jood-line)",
        background: "transparent", color: "var(--jood-ink-muted)", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit",
        opacity: busy ? 0.5 : 1,
      }}
    >
      {busy ? "…" : "Dismiss"}
    </button>
  );
}
