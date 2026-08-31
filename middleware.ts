import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, isPathAllowed, ROLE_HOME } from "@/lib/admin-auth";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Rate limiting ────────────────────────────────────────────────────────────
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured (cross-isolate,
// accurate across Vercel edge nodes). Falls back to in-memory per-isolate
// counting when the env var is absent (dev / preview without Upstash).

let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!upstashLimiter) {
    upstashLimiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(
        process.env.NODE_ENV === "development" ? 120 : 10,
        "60 s"
      ),
      prefix: "jood:rl",
    });
  }
  return upstashLimiter;
}

// In-memory fallback (per-isolate — not shared across Vercel edge instances)
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
    const limiter = getUpstashLimiter();

    if (limiter) {
      const { success } = await limiter.limit(ip);
      if (!success) {
        return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
      }
    } else {
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/s/:path*", "/api/stay/:path*", "/admin", "/admin/:path*"],
};
