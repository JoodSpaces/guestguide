import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";
import { classifyGuestRequest } from "@/lib/classify-request";
import { getBookingFromToken } from "@/lib/guest-auth";

let _limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_limiter) {
    _limiter = new Ratelimit({
      redis: new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }),
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      prefix: "jood:rl:classify",
    });
  }
  return _limiter;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  if (!token || !(await getBookingFromToken(token))) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const limiter = getLimiter();
  if (limiter) {
    const { success } = await limiter.limit(`token:${token}`);
    if (!success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const text = typeof body?.body === "string" ? body.body.trim() : "";

  if (text.length < 10) {
    return NextResponse.json({ category: "other", urgency: "normal" });
  }

  try {
    const result = await classifyGuestRequest(text);
    return NextResponse.json(result);
  } catch (err) {
    Sentry.captureException(err, { tags: { subsystem: "ai_classify" } });
    return NextResponse.json({ category: "other", urgency: "normal" });
  }
}
