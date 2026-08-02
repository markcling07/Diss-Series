import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { getJwtSecret } from './env';

// Read per call rather than once at module load. A module-level constant is
// evaluated during `next build`, which would bake a build machine's value into
// the bundle and throw at build time instead of at boot.
const JWT_SECRET = () => getJwtSecret();

// Shared by both routes that issue a session, so the flags cannot drift apart.
// sameSite 'lax' is what stops another origin's form POST from riding along on
// this cookie; it is the CSRF defence for every mutating route in the app.
export const AUTH_COOKIE_NAME = 'auth_token';

export const authCookieOptions = {
  name: AUTH_COOKIE_NAME,
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export interface UserPayload {
  userId: string;
  role: string;
  username: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET()) as UserPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}
