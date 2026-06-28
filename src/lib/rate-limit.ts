// ─────────────────────────────────────────────────────────────────────────────
// Durable per-user rate limiting.
//
// Uses Upstash Redis (sliding window) when UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN are set — this works correctly across serverless
// instances on Vercel. If those env vars are absent (e.g. local dev before you
// create the Redis DB), it falls back to a best-effort in-memory limiter so the
// app keeps working without extra setup.
// ─────────────────────────────────────────────────────────────────────────────
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const WINDOW = '60 s';
const MAX = 20; // requests per window per user

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const upstashLimiter = hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(MAX, WINDOW),
      analytics: false,
      prefix: 'rl:extract-biodata',
    })
  : null;

// ── In-memory fallback (per warm instance) ──
const buckets = new Map<string, number[]>();
function memoryLimited(key: string): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < 60_000);
  if (hits.length >= MAX) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}

/** Returns true if the caller has exceeded their request budget. */
export async function isRateLimited(key: string): Promise<boolean> {
  if (upstashLimiter) {
    try {
      const { success } = await upstashLimiter.limit(key);
      return !success;
    } catch {
      // If Redis is unreachable, fail open to the in-memory limiter rather than
      // blocking legitimate users.
      return memoryLimited(key);
    }
  }
  return memoryLimited(key);
}
