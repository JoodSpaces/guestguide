"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() { timers.current.forEach(clearTimeout); timers.current = []; }

  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const a = (e.target as Element).closest("a");
      if (!a || !a.href) return;
      try {
        const url = new URL(a.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
        if (a.target === "_blank") return;
      } catch { return; }
      clear();
      setVisible(true);
      setProgress(20);
      timers.current.push(setTimeout(() => setProgress(55), 180));
      timers.current.push(setTimeout(() => setProgress(75), 600));
    }
    document.addEventListener("click", onLinkClick);
    return () => document.removeEventListener("click", onLinkClick);
  }, []);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    clear();
    setProgress(100);
    timers.current.push(setTimeout(() => { setVisible(false); setProgress(0); }, 350));
  }, [pathname]);

  if (!visible) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "2px", zIndex: 9999, pointerEvents: "none" }}>
      <div style={{
        height: "100%",
        width: `${progress}%`,
        backgroundColor: "var(--jood-accent)",
        boxShadow: "0 0 8px var(--jood-accent)",
        transition: progress === 100 ? "width 200ms ease" : "width 500ms cubic-bezier(0.16,1,0.3,1)",
        borderRadius: "0 2px 2px 0",
      }} />
    </div>
  );
}
