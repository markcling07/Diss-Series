import { describe, expect, it } from 'vitest';
import { BadRequestError, badRequestResponse, readJsonBody } from './http';

const jsonRequest = (body: string) =>
  new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

describe('readJsonBody', () => {
  it('parses a valid body', async () => {
    const parsed = await readJsonBody<{ loginId: string }>(
      jsonRequest('{"loginId":"someone@example.com"}')
    );
    expect(parsed.loginId).toBe('someone@example.com');
  });

  it('throws BadRequestError on malformed JSON', async () => {
    await expect(readJsonBody(jsonRequest('{bad'))).rejects.toBeInstanceOf(BadRequestError);
  });

  it('throws BadRequestError on an empty body', async () => {
    await expect(readJsonBody(jsonRequest(''))).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe('badRequestResponse', () => {
  it('turns a BadRequestError into a 400', async () => {
    const response = badRequestResponse(new BadRequestError('Request body must be valid JSON'));

    expect(response).not.toBeNull();
    expect(response!.status).toBe(400);
    await expect(response!.json()).resolves.toEqual({
      error: 'Request body must be valid JSON',
    });
  });

  it('returns null for anything else, so real faults still reach the 500 path', () => {
    // A database outage must not be reported to the caller as their mistake.
    expect(badRequestResponse(new Error('connection refused'))).toBeNull();
    expect(badRequestResponse('not even an error')).toBeNull();
  });
});
