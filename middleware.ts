import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, refreshSession, isPathAllowed, ROLE_HOME } from "@/lib/admin-auth";
import { allow, type RateRule } from "@/lib/rate-limit";
import { UI_COOKIE, UI_COOKIE_MAX_AGE, STAY_HEADER, uiSwitch } from "@/lib/ui-mode";

// ── Rate limits ──────────────────────────────────────────────────────────────
// Each rule has its own counter (see lib/rate-limit.ts). Upstash Redis is used
// when configured; without it the counters are per server instance, which only
// slows an attacker down — configure Upstash in production.
const DEV = process.env.NODE_ENV === "development";
const rule = (name: string, limit: number, windowSec: number): RateRule => ({
  name,
  limit: DEV ? 120 : limit,
  windowSec,
});

const RULES = {
  adminLogin:   rule("admin-login", 10, 300),
  // Several guests can share one public IP (a compound, a hotel, a mobile carrier's NAT), so the
  // per-IP budgets for guest actions are generous. What actually protects these endpoints is not
  // the IP: door-code guesses are capped per booking in the database, the concierge has a daily cap
  // per booking in Redis, and stay links are 132-bit secrets.
  revealCode:   rule("reveal-code", 30, 300),
  concierge:    rule("concierge", 60, 300),
  pushSub:      rule("push-subscribe", 30, 300),
  resolve:      rule("resolve", 60, 60),
  // Both send an email to the office (and to the guest) and one calls the AI classifier.
  guestWrites:  rule("guest-writes", 30, 300),
  // Opening a stay screen makes ~10 requests (the page plus Next prefetching every link on it).
  // One budget per guest link, and a much higher one per IP as a backstop against a flood.
  stayPageToken: rule("stay-page-token", 240, 60),
  stayPageIp:    rule("stay-page-ip", 1200, 60),
};

const STAY_TOKEN_RE = /^\/s\/([A-Za-z0-9_-]{22})(?:\/|$)/;

function ruleFor(pathname: string, method: string): RateRule | null {
  if (pathname === "/api/admin/auth" && method === "POST") return RULES.adminLogin;
  if (pathname === "/api/stay/reveal-code") return RULES.revealCode;
  if (pathname === "/api/guest/concierge") return RULES.concierge;
  if (pathname === "/api/stay/push-subscribe") return RULES.pushSub;
  if (pathname === "/api/stay/resolve") return RULES.resolve;
  if (
    (pathname === "/api/guest/requests" || pathname === "/api/guest/service-requests") &&
    method === "POST"
  ) return RULES.guestWrites;
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin auth + role gate ──────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookieVal = req.cookies.get("jood_admin")?.value;
    const verified = cookieVal ? await verifyAdminCookie(cookieVal) : null;
    // Re-read the member: a deactivated, demoted or re-scoped account must not
    // keep the access its (7-day) cookie was issued with.
    const session = verified ? await refreshSession(verified) : null;

    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    if (!isPathAllowed(pathname, session.role)) {
      const url = req.nextUrl.clone();
      url.pathname = ROLE_HOME[session.role] ?? "/admin";
      return NextResponse.redirect(url);
    }

    // Forward role, name and property scope to server components. `set` (never
    // "only if absent") so a client cannot smuggle its own values in.
    // x-admin-props: "" = all properties, otherwise a JSON array of property ids.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-admin-role", session.role);
    requestHeaders.set("x-admin-name", session.name);
    requestHeaders.set(
      "x-admin-props",
      session.role !== "admin" && session.propertyIds ? JSON.stringify(session.propertyIds) : "",
    );
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ?ui=next / ?ui=classic on a stay link chooses the look (kept in a cookie), then the address is cleaned.
  const uiChoice = pathname.startsWith("/s/") ? uiSwitch(req.nextUrl.searchParams) : null;
  if (uiChoice) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete("ui");
    const res = NextResponse.redirect(clean);
    res.cookies.set(UI_COOKIE, uiChoice, { path: "/", maxAge: UI_COOKIE_MAX_AGE, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return res;
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Stay screens: a budget per guest link, plus a high per-IP backstop.
  if (pathname.startsWith("/s/")) {
    const token = STAY_TOKEN_RE.exec(pathname)?.[1];
    const allowed =
      (await allow(RULES.stayPageIp, ip)) &&
      (!token || (await allow(RULES.stayPageToken, token)));
    if (!allowed) {
      return new NextResponse(
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
          "<body style='font-family:system-ui;padding:3rem 1.5rem;text-align:center'>" +
          "<h1 style='font-size:1.3rem'>One moment</h1><p>Please wait a few seconds and reload.</p>" +
          "<p dir=rtl>من فضلك انتظر لحظات ثم أعد تحميل الصفحة.</p></body>",
        { status: 429, headers: { "Retry-After": "30", "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    // Tell the root layout this is a stay page, where the new look is the default.
    const stayHeaders = new Headers(req.headers);
    stayHeaders.set(STAY_HEADER, "1");
    return NextResponse.next({ request: { headers: stayHeaders } });
  }

  const limited = ruleFor(pathname, req.method);
  if (limited && !(await allow(limited, ip))) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(Math.min(limited.windowSec, 300)) },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/s/:path*", "/api/stay/:path*", "/api/guest/:path*", "/api/admin/auth", "/admin", "/admin/:path*"],
};
