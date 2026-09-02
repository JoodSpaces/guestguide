import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, isPathAllowed, ROLE_HOME } from "@/lib/admin-auth";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Rate limiting ────────────────────────────────────────────────────────────
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured (cross-isolate,
// accurate across Vercel edge nodes). Falls back to in-memory per-isolate
// counting when the env var is absent (dev / preview without Upstash).

let upstashLimiter: Ratelimit | null = null;
let upstashApiLimiter: Ratelimit | null = null;

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function hasUpstash() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getUpstashLimiter(): Ratelimit | null {
  if (!hasUpstash()) return null;
  if (!upstashLimiter) {
    upstashLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(
        process.env.NODE_ENV === "development" ? 120 : 10,
        "60 s"
      ),
      prefix: "jood:rl",
    });
  }
  return upstashLimiter;
}

// Stricter limiter for auth/sensitive API endpoints: 10 req / 5 min per IP
function getApiLimiter(): Ratelimit | null {
  if (!hasUpstash()) return null;
  if (!upstashApiLimiter) {
    upstashApiLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(
        process.env.NODE_ENV === "development" ? 120 : 10,
        "300 s"
      ),
      prefix: "jood:api-rl",
    });
  }
  return upstashApiLimiter;
}

// In-memory fallback (per-isolate — not shared across Vercel edge instances)
const tokenRequestMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = process.env.NODE_ENV === "development" ? 120 : 10;
const RATE_WINDOW_MS = 60_000;

// Separate fallback for admin login: 10 attempts per 5 minutes per IP
const adminLoginMap = new Map<string, { count: number; resetAt: number }>();
const ADMIN_RATE_LIMIT = process.env.NODE_ENV === "development" ? 120 : 10;
const ADMIN_RATE_WINDOW_MS = 5 * 60_000;

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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // ── Rate-limit sensitive API endpoints (auth, reveal-code, concierge) ──
  const isSensitiveApi =
    pathname === "/api/admin/auth" ||
    pathname === "/api/stay/reveal-code" ||
    pathname === "/api/guest/concierge" ||
    pathname.startsWith("/api/stay/subscribe-push");

  if (isSensitiveApi) {
    const limiter = getApiLimiter();
    if (limiter) {
      const { success } = await limiter.limit(ip);
      if (!success) {
        return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": "300" } });
      }
    } else if (pathname === "/api/admin/auth") {
      // In-memory fallback for admin login when Upstash is not configured
      const now = Date.now();
      const entry = adminLoginMap.get(ip);
      if (!entry || now > entry.resetAt) {
        adminLoginMap.set(ip, { count: 1, resetAt: now + ADMIN_RATE_WINDOW_MS });
      } else {
        entry.count += 1;
        if (entry.count > ADMIN_RATE_LIMIT) {
          return new NextResponse("Too many requests", { status: 429, headers: { "Retry-After": "300" } });
        }
      }
    }
  }

  // ── Rate-limit guest token page routes ─────────────────────────────────
  if (pathname.startsWith("/s/")) {
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
  matcher: ["/s/:path*", "/api/stay/:path*", "/api/guest/:path*", "/api/admin/auth", "/admin", "/admin/:path*"],
};
