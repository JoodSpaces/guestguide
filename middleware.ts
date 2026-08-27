import { NextRequest, NextResponse } from "next/server";

// Rate limiting state (edge-compatible: in-memory per isolate)
// Production: use Upstash Redis via @upstash/ratelimit
const tokenRequestMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = process.env.NODE_ENV === "development" ? 120 : 10;
const RATE_WINDOW_MS = 60_000;

async function verifyAdminCookie(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [iat, exp, sig] = parts;
    if (Date.now() > Number(exp)) return false;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const payload = `${iat}.${exp}`;
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    );
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin auth gate — exclude login page itself
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get("jood_admin")?.value;
    const secret = process.env.ADMIN_SECRET ?? "";

    if (!token || !(await verifyAdminCookie(token, secret))) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // Rate-limit token resolution routes
  if (pathname.startsWith("/s/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const entry = tokenRequestMap.get(ip);

    if (!entry || now > entry.resetAt) {
      tokenRequestMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else {
      entry.count += 1;
      if (entry.count > RATE_LIMIT) {
        return new NextResponse("Too many requests", {
          status: 429,
          headers: { "Retry-After": "60" },
        });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/s/:path*", "/api/stay/:path*", "/admin", "/admin/:path*"],
};
