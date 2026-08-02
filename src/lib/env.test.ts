import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJwtSecret } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

// The entire point of this module is that a missing secret is loud. A silent
// fallback in production means sessions are signed with a value that lives in
// the repository, and anyone who reads it can mint a SUPER_ADMIN token.
describe('getJwtSecret', () => {
  it('returns the configured secret when set', () => {
    vi.stubEnv('JWT_SECRET', 'a-real-secret');
    vi.stubEnv('NODE_ENV', 'production');

    expect(getJwtSecret()).toBe('a-real-secret');
  });

  it('throws in production when unset', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => getJwtSecret()).toThrow(/JWT_SECRET is not set/);
  });

  it('falls back in development so a fresh clone runs', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'development');

    expect(getJwtSecret()).toBe('dev-only-insecure-secret');
  });

  it('never hands the development fallback to production', () => {
    vi.stubEnv('JWT_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => getJwtSecret()).toThrow();
  });
});
