// In-memory fixed-window rate limiter. Fine for a single-instance deploy
// (this app's actual topology — see docs/deploy.md); a multi-instance
// deploy would need a shared store (Redis) instead, same caveat as the CMS
// config cache in modules/cms/config.ts.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic sweep so long-lived buckets from one-off callers don't accumulate
// forever. Not correctness-critical (checkRateLimit self-heals expired
// buckets on next access) — just keeps memory bounded.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref();

export function checkRateLimit(key: string, opts: { windowMs: number; max: number }): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (bucket.count >= opts.max) {
    return false;
  }
  bucket.count += 1;
  return true;
}
