/**
 * A small tap under the finger. iPhone has no vibrate API, but Safari 17.4+ gives a real haptic when a hidden
 * checkbox "switch" is toggled, so that is what this uses there; other phones use navigator.vibrate.
 * Always safe to call: it does nothing where neither works, and never throws.
 */
let host: HTMLLabelElement | null = null;

function iosTap() {
  if (typeof document === "undefined") return false;
  try {
    if (!host) {
      host = document.createElement("label");
      host.setAttribute("aria-hidden", "true");
      host.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      host.appendChild(input);
      document.body.appendChild(host);
    }
    host.click();
    return true;
  } catch {
    return false;
  }
}

export function haptic(kind: "tap" | "success" = "tap") {
  if (typeof navigator === "undefined") return;
  const isIos = /iP(hone|ad|od)/.test(navigator.userAgent);
  if (isIos) {
    iosTap();
    if (kind === "success") setTimeout(iosTap, 90);
    return;
  }
  try { navigator.vibrate?.(kind === "success" ? [18, 40, 18] : 12); } catch { /* not allowed here */ }
}
