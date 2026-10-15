"use client";

import { useEffect, useState } from "react";

const KEY = "jood-install-hint-dismissed";

/**
 * On an iPhone in Safari (not yet on the Home Screen) this explains the two taps that make the stay an app.
 * It shows once, can be dismissed for good, and never shows inside the installed app or on other phones.
 */
export function InstallHint({ isAr }: { isAr: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const ua = navigator.userAgent;
      const ios = /iP(hone|ad|od)/.test(ua);
      const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
      const standalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
      if (ios && safari && !standalone && localStorage.getItem(KEY) !== "1") setShow(true);
    } catch { /* storage blocked: stay hidden */ }
  }, []);

  if (!show) return null;
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setShow(false); };

  return (
    <div className="home-note install-hint" role="note">
      <span className="ih-icon" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{isAr ? "أضفها إلى الشاشة الرئيسية" : "Keep your stay on your Home Screen"}</b>
        <p>{isAr ? "اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»." : "Tap Share, then “Add to Home Screen”. It opens like an app, with notifications."}</p>
      </div>
      <button type="button" onClick={close} aria-label={isAr ? "إغلاق" : "Dismiss"}>✕</button>
    </div>
  );
}
