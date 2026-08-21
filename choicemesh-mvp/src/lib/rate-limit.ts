/**
 * A small in-memory rate limiter for the AI route.
 *
 * This is deliberately per-instance rather than shared state. It is enough to
 * stop one visitor from burning the API budget on a portfolio deployment; it is
 * not a defence against a distributed attacker, and a multi-instance
 * production release would move this to Postgres or a KV store.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  // Opportunistic cleanup keeps the map from growing without bound on a
  // long-lived instance.
  if (buckets.size > 5000) {
    for (const [entryKey, entry] of buckets) if (entry.resetAt <= now) buckets.delete(entryKey);
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  if (bucket.count > limit) return { allowed: false, remaining: 0, retryAfterSeconds };
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/** Test hook. */
export function resetRateLimits() {
  buckets.clear();
}
