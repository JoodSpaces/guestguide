"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Swipe a sheet down to close it. Spread `handlers` on the grab handle (or the whole top of the sheet);
 * `offset` is how far it has been pulled, to translate the sheet while the finger is down.
 */
export function useSwipeDown(onClose: () => void, threshold = 90) {
  const [offset, setOffset] = useState(0);
  const start = useRef<number | null>(null);
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => { start.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); },
    onPointerMove: (e: React.PointerEvent) => { if (start.current !== null) setOffset(Math.max(0, e.clientY - start.current)); },
    onPointerUp: () => {
      const moved = offset;
      start.current = null;
      setOffset(0);
      if (moved > threshold) onClose();
    },
    onPointerCancel: () => { start.current = null; setOffset(0); },
    style: { touchAction: "none", cursor: "grab" } as React.CSSProperties,
  };
  return { offset, handlers };
}

/**
 * Pull the page down at the top to refresh it. `pull` is the distance (0 when idle) for an indicator; `armed` turns true
 * once it is far enough that letting go will refresh.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void, threshold = 70) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || busy) return;
    const d = e.touches[0].clientY - startY.current;
    setPull(d > 0 ? Math.min(110, d * 0.5) : 0);
  }, [busy]);
  const onTouchEnd = useCallback(async () => {
    const armed = pull >= threshold * 0.5;
    startY.current = null;
    if (!armed) { setPull(0); return; }
    setBusy(true);
    setPull(48);
    try { await onRefresh(); } finally { setTimeout(() => { setBusy(false); setPull(0); }, 600); }
  }, [pull, threshold, onRefresh]);

  return { pull, busy, armed: pull >= threshold * 0.5, bind: { onTouchStart, onTouchMove, onTouchEnd } };
}
