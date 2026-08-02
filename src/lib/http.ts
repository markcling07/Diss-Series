import { NextResponse } from 'next/server';

// A body that isn't JSON is the caller's mistake, not ours. Left unhandled it
// throws out of the route into the generic catch, which logs a stack trace and
// answers 500 — telling the caller to retry something that will never work, and
// burying real faults in the log under noise anyone can generate.
export class BadRequestError extends Error {}

export async function readJsonBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new BadRequestError('Request body must be valid JSON');
  }
}

// Routes call this from their catch block so one branch handles the expected
// failure and the existing 500 path still covers everything unexpected.
export function badRequestResponse(error: unknown): NextResponse | null {
  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return null;
}
