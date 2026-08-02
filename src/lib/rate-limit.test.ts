import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, clientKey, tooManyRequests } from './rate-limit';

// The limiter keeps state in a module-level map, so every test uses its own key
// rather than resetting shared state.
let counter = 0;
const uniqueKey = () => `test-key-${counter++}`;

afterEach(() => {
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('allows requests up to the limit', () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).ok).toBe(true);
    }
  });

  it('blocks the request after the limit', () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60_000);

    const blocked = checkRateLimit(key, 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps separate keys independent', () => {
    const a = uniqueKey();
    const b = uniqueKey();

    for (let i = 0; i < 5; i++) checkRateLimit(a, 5, 60_000);

    expect(checkRateLimit(a, 5, 60_000).ok).toBe(false);
    expect(checkRateLimit(b, 5, 60_000).ok).toBe(true);
  });

  it('lets the caller through again once the window elapses', () => {
    vi.useFakeTimers();
    const key = uniqueKey();

    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
  });

  it('does not let a blocked caller extend their own lockout', () => {
    // Hammering while blocked must not push the reset further out, or a bot
    // that keeps retrying would lock a shared IP out indefinitely.
    vi.useFakeTimers();
    const key = uniqueKey();

    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000);

    vi.advanceTimersByTime(30_000);
    for (let i = 0; i < 50; i++) checkRateLimit(key, 3, 60_000);

    vi.advanceTimersByTime(30_001);
    expect(checkRateLimit(key, 3, 60_000).ok).toBe(true);
  });

  it('reports a retry-after that shrinks as the window drains', () => {
    vi.useFakeTimers();
    const key = uniqueKey();

    checkRateLimit(key, 1, 60_000);
    const early = checkRateLimit(key, 1, 60_000).retryAfterSeconds;

    vi.advanceTimersByTime(30_000);
    const later = checkRateLimit(key, 1, 60_000).retryAfterSeconds;

    expect(later).toBeLessThan(early);
    expect(later).toBeGreaterThan(0);
  });
});

// This is the security-relevant half. X-Forwarded-For is a list the client can
// seed: anything it sends arrives to the left of what our own proxy appends.
// Keying on the leftmost entry would let a caller mint a fresh bucket per
// request and make the limiter decorative.
describe('clientKey', () => {
  const withHeaders = (headers: Record<string, string>) =>
    new Request('http://localhost/api/auth/login', { headers });

  it('uses the rightmost X-Forwarded-For entry', () => {
    const req = withHeaders({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' });
    expect(clientKey(req, 'login')).toBe('login:3.3.3.3');
  });

  it('ignores a client-supplied entry sitting to the left', () => {
    const spoofed = withHeaders({ 'x-forwarded-for': '9.9.9.9, 203.0.113.7' });
    const honest = withHeaders({ 'x-forwarded-for': '203.0.113.7' });

    // Both must land in the same bucket, or the spoofed value bought the
    // caller a fresh allowance.
    expect(clientKey(spoofed, 'login')).toBe(clientKey(honest, 'login'));
  });

  it('tolerates whitespace and trailing separators', () => {
    const req = withHeaders({ 'x-forwarded-for': '1.1.1.1 ,  2.2.2.2 , ' });
    expect(clientKey(req, 'login')).toBe('login:2.2.2.2');
  });

  it('falls back to X-Real-IP when no forwarded header is present', () => {
    const req = withHeaders({ 'x-real-ip': '198.51.100.4' });
    expect(clientKey(req, 'upload')).toBe('upload:198.51.100.4');
  });

  it('collapses to a single bucket when no address header exists', () => {
    // Fails closed: with no proxy in front, everyone shares one allowance
    // rather than everyone getting an unlimited one.
    expect(clientKey(withHeaders({}), 'login')).toBe('login:unknown');
  });

  it('separates scopes so login attempts do not consume the upload budget', () => {
    const req = withHeaders({ 'x-forwarded-for': '203.0.113.7' });
    expect(clientKey(req, 'login')).not.toBe(clientKey(req, 'upload'));
  });
});

describe('tooManyRequests', () => {
  it('answers 429 with a Retry-After header', () => {
    const response = tooManyRequests(42);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('42');
  });
});
