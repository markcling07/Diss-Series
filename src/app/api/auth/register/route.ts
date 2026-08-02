import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authCookieOptions, hashPassword, signToken } from '@/lib/auth';
import { checkRateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit';
import { badRequestResponse, readJsonBody } from '@/lib/http';

// Tighter than login: there is no legitimate reason for one address to create
// accounts in a burst, and every account is a row plus a bcrypt hash.
const MAX_SIGNUPS = 5;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const limit = checkRateLimit(clientKey(req, 'register'), MAX_SIGNUPS, WINDOW_MS);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfterSeconds);
    }

    const { username, email, password } = await readJsonBody<{
      username?: string;
      email?: string;
      password?: string;
    }>(req);

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'USER',
      },
    });

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

    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
