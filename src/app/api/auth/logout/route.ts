import { NextResponse } from 'next/server';
import { authCookieOptions } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  // Same attributes as the cookie being cleared. A browser will not replace a
  // cookie unless name, path and domain all match, so reusing the shared
  // options is what makes the logout actually take effect.
  response.cookies.set({ ...authCookieOptions, value: '', maxAge: 0 });

  return response;
}
