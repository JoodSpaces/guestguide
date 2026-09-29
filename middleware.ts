import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, refreshSession, isPathAllowed, ROLE_HOME } from "@/lib/admin-auth";
import { allow, type RateRule } from "@/lib/rate-limit";

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
  revealCode:   rule("reveal-code", 10, 300),
  concierge:    rule("concierge", 30, 300),
  pushSub:      rule("push-subscribe", 10, 300),
  resolve:      rule("resolve", 30, 60),
  // Both send an email to the office (and to the guest) and one calls the AI classifier.
  guestWrites:  rule("guest-writes", 10, 300),
  stayPages:    rule("stay-pages", 10, 60),
};

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
  if (pathname.startsWith("/s/")) return RULES.stayPages;
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

  const limited = ruleFor(pathname, req.method);
  if (limited) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!(await allow(limited, ip))) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(Math.min(limited.windowSec, 300)) },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/s/:path*", "/api/stay/:path*", "/api/guest/:path*", "/api/admin/auth", "/admin", "/admin/:path*"],
};
