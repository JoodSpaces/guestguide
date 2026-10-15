"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

// The round back button of the reference. `style` is accepted for older callers and ignored.

/**
 * "← Back" that returns to the page the staff member actually came from (a property list, a booking…)
 * and only falls back to a fixed page when they landed here directly (a bookmark, a shared link).
 */
export function BackLink({ fallbackHref, title = "" }: { fallbackHref: string; title?: string; style?: CSSProperties }) {
  const router = useRouter();

  function go(e: React.MouseEvent) {
    e.preventDefault();
    const cameFromHere =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer.startsWith(window.location.origin);
    if (cameFromHere) router.back();
    else router.push(fallbackHref);
  }

  return (
    <div className="app-dhead">
      <a href={fallbackHref} onClick={go} className="app-roundbtn" aria-label="Back">←</a>
      <p>{title}</p>
      <div />
    </div>
  );
}
