// src/lib/rateLimit.ts
import { MiddlewareHandler } from 'hono';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: This resets on worker restart, which is acceptable for basic protection
// in Cloudflare Workers where instances are short-lived
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically to prevent memory bloat
function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client IP from request headers
 * Prioritizes Cloudflare's CF-Connecting-IP, falls back to X-Forwarded-For
 */
export function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Create a rate limiting middleware
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @param keyPrefix - Optional prefix for the rate limit key (useful for different rate limit tiers)
 */
export function rateLimit(
  limit: number,
  windowMs: number,
  keyPrefix = 'default'
): MiddlewareHandler {
  let lastCleanup = Date.now();

  return async (c, next) => {
    // Skip rate limiting in local dev (when not behind Cloudflare)
    // In production, Cloudflare always sets CF-Connecting-IP header
    const isBehindCloudflare = c.req.header('cf-connecting-ip');
    if (!isBehindCloudflare) {
      await next();
      return;
    }

    const now = Date.now();
    const ip = getClientIp(c);
    const key = `${keyPrefix}:${ip}`;

    // Clean up expired entries every minute
    if (now - lastCleanup > 60000) {
      cleanupExpiredEntries(now);
      lastCleanup = now;
    }

    let entry = rateLimitStore.get(key);

    if (!entry || now >= entry.resetTime) {
      // First request in window or window has expired
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment count
      entry.count++;
    }

    if (entry.count > limit) {
      // Rate limit exceeded
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);

      c.header('Retry-After', String(retryAfterSeconds));
      c.header('X-RateLimit-Limit', String(limit));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

      return c.json(
        {
          error: 'Too many requests',
          retryAfter: retryAfterSeconds,
        },
        429
      );
    }

    // Add rate limit headers to successful responses
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(limit - entry.count));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    await next();
  };
}

// Pre-configured rate limiters for common use cases
export const generalRateLimit = rateLimit(100, 60000, 'general'); // 100 req/min
export const sensitiveRateLimit = rateLimit(10, 60000, 'sensitive'); // 10 req/min

// For testing: expose the store for clearing between tests
export const _rateLimitStoreForTesting = rateLimitStore;
