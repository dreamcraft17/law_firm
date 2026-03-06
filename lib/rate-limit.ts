/**
 * Simple in-memory rate limiter (per key).
 * Use for login and sensitive endpoints. Resets after windowMs.
 */

const store = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX = 10; // e.g. 10 login attempts per minute per IP

export type RateLimitOptions = {
  windowMs?: number;
  max?: number;
};

/** Returns true if under limit; false if rate limited. Calls increment. */
export function rateLimit(
  key: string,
  options: { windowMs?: number; max?: number } = {}
): { allowed: boolean; remaining: number; resetAt: number } {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: max - 1, resetAt: entry.resetAt };
  }
  entry.count += 1;
  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/** Get client identifier for rate limit key (IP or x-forwarded-for). */
export function getRateLimitKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'unknown';
  return `${prefix}:${ip}`;
}

/** Clean old entries periodically to avoid memory leak (optional). */
export function cleanExpiredRateLimits(): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now >= v.resetAt) store.delete(k);
  }
}
