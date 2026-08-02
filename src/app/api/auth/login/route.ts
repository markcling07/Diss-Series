import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authCookieOptions, comparePassword, signToken } from '@/lib/auth';
import { checkRateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit';
import { badRequestResponse, readJsonBody } from '@/lib/http';

// Ten attempts per five minutes. Generous enough that nobody fat-fingering a
// password ever meets it, tight enough that guessing is pointless.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const limit = checkRateLimit(clientKey(req, 'login'), MAX_ATTEMPTS, WINDOW_MS);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfterSeconds);
    }

    const { loginId, password } = await readJsonBody<{
      loginId?: string;
      password?: string;
    }>(req);

    if (!loginId || !password) {
      return NextResponse.json({ error: 'Please provide email/username and password' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginId },
          { username: loginId },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      username: user.username,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({ ...authCookieOptions, value: token });

    return response;
  } catch (error) {
    const badRequest = badRequestResponse(error);
    if (badRequest) return badRequest;

    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
