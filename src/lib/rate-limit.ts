import { NextResponse } from 'next/server';

// A fixed-window counter held in this process's memory. That is the honest
// scope of it: it protects a single `next start` instance, which is what this
// app is deployed as. Run two instances behind a load balancer and each gets
// its own allowance — at that point the limit belongs in nginx or Redis, not
// here. It is still worth having: without it, the login endpoint is an offline
// password-guessing oracle that answers as fast as bcrypt can run.

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// Sweeping on write keeps the map from growing without bound. Every entry is
// already self-expiring, so this only has to run often enough that a burst of
// unique keys does not accumulate — not on a timer.
function sweep(now: number): void {
  if (windows.size < 5000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { ok: true, retryAfterSeconds: 0 };
}

// X-Forwarded-For is attacker-controlled unless something trusted rewrites it,
// so the *leftmost* entry must never be used as a limiter key — a client can
// send a fresh one per request and reset its own allowance. The rightmost entry
// is the one appended by the closest proxy, which is our own reverse proxy in
// the documented deployment. With no proxy at all the header is absent and
// every caller collapses into one shared bucket, which fails closed (stricter)
// rather than open.
export function clientKey(req: Request, scope: string): string {
  const forwarded = req.headers.get('x-forwarded-for');

  const ip = forwarded
    ? forwarded.split(',').map((part) => part.trim()).filter(Boolean).pop()
    : req.headers.get('x-real-ip');

  return `${scope}:${ip || 'unknown'}`;
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}
