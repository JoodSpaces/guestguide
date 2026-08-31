import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, isPathAllowed, ROLE_HOME } from "@/lib/admin-auth";

// Rate limiting state (edge-compatible: in-memory per isolate)
const tokenRequestMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = process.env.NODE_ENV === "development" ? 120 : 10;
const RATE_WINDOW_MS = 60_000;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin auth + role gate ──────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookieVal = req.cookies.get("jood_admin")?.value;
    const session = cookieVal ? await verifyAdminCookie(cookieVal) : null;

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

    // Forward role + name to server components via request headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-admin-role", session.role);
    requestHeaders.set("x-admin-name", session.name);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Rate-limit guest token routes ──────────────────────────────────────
  if (pathname.startsWith("/s/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const entry = tokenRequestMap.get(ip);
    if (!entry || now > entry.resetAt) {
      tokenRequestMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else {
      entry.count += 1;
      if (entry.count > RATE_LIMIT) {
        return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/s/:path*", "/api/stay/:path*", "/admin", "/admin/:path*"],
};
