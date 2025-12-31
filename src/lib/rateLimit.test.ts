// src/lib/rateLimit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, getClientIp, _rateLimitStoreForTesting } from './rateLimit';

// Mock context factory
function createMockContext(headers: Record<string, string> = {}) {
  const responseHeaders: Record<string, string> = {};
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()],
    },
    header: (name: string, value: string) => {
      responseHeaders[name] = value;
    },
    json: (body: unknown, status?: number) => ({ body, status: status || 200 }),
    _responseHeaders: responseHeaders,
  };
}

describe('getClientIp', () => {
  it('returns cf-connecting-ip when available', () => {
    const c = createMockContext({ 'cf-connecting-ip': '1.2.3.4' });
    expect(getClientIp(c)).toBe('1.2.3.4');
  });

  it('falls back to x-forwarded-for when cf-connecting-ip is not available', () => {
    const c = createMockContext({ 'x-forwarded-for': '5.6.7.8, 9.10.11.12' });
    expect(getClientIp(c)).toBe('5.6.7.8');
  });

  it('returns unknown when no IP headers are present', () => {
    const c = createMockContext({});
    expect(getClientIp(c)).toBe('unknown');
  });

  it('prefers cf-connecting-ip over x-forwarded-for', () => {
    const c = createMockContext({
      'cf-connecting-ip': '1.2.3.4',
      'x-forwarded-for': '5.6.7.8',
    });
    expect(getClientIp(c)).toBe('1.2.3.4');
  });
});

describe('rateLimit middleware', () => {
  beforeEach(() => {
    // Clear the rate limit store between tests
    _rateLimitStoreForTesting.clear();
    vi.useFakeTimers();
  });

  it('allows requests under the limit', async () => {
    const middleware = rateLimit(5, 60000, 'test');
    const c = createMockContext({ 'cf-connecting-ip': '1.2.3.4' });
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
    };

    await middleware(c as any, next);

    expect(nextCalled).toBe(true);
  });

  it('sets rate limit headers on successful requests', async () => {
    const middleware = rateLimit(5, 60000, 'test');
    const c = createMockContext({ 'cf-connecting-ip': '1.2.3.4' });
    const next = async () => {};

    await middleware(c as any, next);

    expect(c._responseHeaders['X-RateLimit-Limit']).toBe('5');
    expect(c._responseHeaders['X-RateLimit-Remaining']).toBeDefined();
  });

  it('blocks requests that exceed the limit', async () => {
    const middleware = rateLimit(3, 60000, 'test');
    const c = createMockContext({ 'cf-connecting-ip': '1.2.3.4' });
    const next = async () => {};

    // Make 3 requests (should succeed)
    await middleware(c as any, next);
    await middleware(c as any, next);
    await middleware(c as any, next);

    // 4th request should be blocked
    const result = await middleware(c as any, next);

    expect(result).toEqual({
      body: { error: 'Too many requests', retryAfter: expect.any(Number) },
      status: 429,
    });
  });

  it('sets Retry-After header when rate limited', async () => {
    const middleware = rateLimit(1, 60000, 'test');
    const c = createMockContext({ 'cf-connecting-ip': '1.2.3.4' });
    const next = async () => {};

    // First request succeeds
    await middleware(c as any, next);

    // Second request should be rate limited
    await middleware(c as any, next);

    expect(c._responseHeaders['Retry-After']).toBeDefined();
    expect(parseInt(c._responseHeaders['Retry-After'])).toBeGreaterThan(0);
  });

  it('resets after the window expires', async () => {
    const middleware = rateLimit(2, 60000, 'test');
    const c = createMockContext({ 'cf-connecting-ip': '1.2.3.4' });
    let nextCallCount = 0;
    const next = async () => {
      nextCallCount++;
    };

    // Make 2 requests (should succeed)
    await middleware(c as any, next);
    await middleware(c as any, next);
    expect(nextCallCount).toBe(2);

    // 3rd request should be blocked
    const result = await middleware(c as any, next);
    expect(result).toEqual({
      body: { error: 'Too many requests', retryAfter: expect.any(Number) },
      status: 429,
    });

    // Advance time past the window
    vi.advanceTimersByTime(61000);

    // Now requests should work again
    await middleware(c as any, next);
    expect(nextCallCount).toBe(3);
  });

  it('tracks different IPs separately', async () => {
    const middleware = rateLimit(1, 60000, 'test');
    const c1 = createMockContext({ 'cf-connecting-ip': '1.1.1.1' });
    const c2 = createMockContext({ 'cf-connecting-ip': '2.2.2.2' });
    let nextCallCount = 0;
    const next = async () => {
      nextCallCount++;
    };

    // First IP makes a request
    await middleware(c1 as any, next);
    expect(nextCallCount).toBe(1);

    // First IP should be rate limited
    const result1 = await middleware(c1 as any, next);
    expect(result1).toEqual({
      body: { error: 'Too many requests', retryAfter: expect.any(Number) },
      status: 429,
    });

    // Second IP should still be allowed
    await middleware(c2 as any, next);
    expect(nextCallCount).toBe(2);
  });

  it('uses different key prefixes to separate rate limit pools', async () => {
    const generalMiddleware = rateLimit(2, 60000, 'general');
    const sensitiveMiddleware = rateLimit(1, 60000, 'sensitive');
    const c = createMockContext({ 'cf-connecting-ip': '1.2.3.4' });
    let nextCallCount = 0;
    const next = async () => {
      nextCallCount++;
    };

    // Use up the sensitive limit
    await sensitiveMiddleware(c as any, next);
    const sensitiveResult = await sensitiveMiddleware(c as any, next);
    expect(sensitiveResult).toEqual({
      body: { error: 'Too many requests', retryAfter: expect.any(Number) },
      status: 429,
    });

    // General limit should still work
    await generalMiddleware(c as any, next);
    await generalMiddleware(c as any, next);
    expect(nextCallCount).toBe(3);
  });
});
