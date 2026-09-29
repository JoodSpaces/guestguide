import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateRule {
  /** Stable name: it namespaces the counter so endpoints don't share a budget. */
  name: string;
  limit: number;
  windowSec: number;
}

/** Fixed-window counter used when Upstash is not configured (per server instance only). */
export function memoryHit(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    // Opportunistic cleanup so the map cannot grow without bound.
    if (store.size > 5000) for (const [k, v] of store) if (now > v.resetAt) store.delete(k);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();
const upstashLimiters = new Map<string, Ratelimit>();

function upstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Returns true when the request is allowed. Uses Upstash (shared across every
 * serverless instance) when configured, otherwise a per-instance counter — which
 * only slows a determined attacker down, so configure Upstash in production.
 */
export async function allow(rule: RateRule, ip: string): Promise<boolean> {
  if (upstashConfigured()) {
    let limiter = upstashLimiters.get(rule.name);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        }),
        limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSec} s`),
        prefix: `jood:rl:${rule.name}`,
      });
      upstashLimiters.set(rule.name, limiter);
    }
    const { success } = await limiter.limit(ip);
    return success;
  }
  return memoryHit(memoryStore, `${rule.name}:${ip}`, rule.limit, rule.windowSec * 1000);
}
