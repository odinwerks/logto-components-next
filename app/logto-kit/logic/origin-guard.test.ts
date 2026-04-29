import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { checkSameOrigin } from './origin-guard';

function makeRequest(origin: string | null, baseUrl = 'http://localhost:3000'): NextRequest {
  process.env.BASE_URL = baseUrl;
  const req = new NextRequest('http://localhost:3000/api/wipe', {
    method: 'POST',
    headers: origin ? { origin } : {},
  });
  return req;
}

describe('checkSameOrigin', () => {
  it('returns null (allows) for same-origin POST', () => {
    const res = checkSameOrigin(makeRequest('http://localhost:3000'));
    expect(res).toBeNull();
  });

  it('returns 403 for cross-origin request', () => {
    const res = checkSameOrigin(makeRequest('https://evil.com'));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('returns 403 when Origin header is missing (fail-closed)', () => {
    const res = checkSameOrigin(makeRequest(null));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('returns 403 for null-origin header', () => {
    const res = checkSameOrigin(makeRequest('null'));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('handles different ports as different origins', () => {
    const res = checkSameOrigin(makeRequest('http://localhost:4000'));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });
});
