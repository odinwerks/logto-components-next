import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Build a NextRequest that mimics a browser request to /api/wipe
 * with Logto cookies present.
 */
function makeWipeRequest(
  method: 'GET' | 'POST' = 'POST',
  force = false,
  origin?: string,
  nonce?: string,
  nonceCookie?: string,
  referer?: string,
): NextRequest {
  const search = new URLSearchParams();
  if (force) search.set('force', 'true');
  if (nonce) search.set('nonce', nonce);
  const qs = search.toString();
  const url = `http://localhost:3000/api/wipe${qs ? `?${qs}` : ''}`;
  const headers: Record<string, string> = {};
  if (method === 'POST' && origin) headers.origin = origin;
  if (referer) headers.referer = referer;

  const req = new NextRequest(url, {
    method,
    headers,
  });

  // Simulate Logto cookies that should be cleared
  req.cookies.set('logto_token', 'fake-id-token-value');
  req.cookies.set('logto_refresh', 'fake-refresh-token-value');
  req.cookies.set('logto_active_org', 'org-123');
  if (nonceCookie) {
    req.cookies.set('logto-wipe-nonce', nonceCookie);
  }

  return req;
}

/**
 * Collect all Set-Cookie header values from a response.
 */
function getSetCookies(res: Response): string[] {
  const setCookies: string[] = [];
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') setCookies.push(value);
  });
  return setCookies;
}

// ── Mocks ─────────────────────────────────────────────────────────────────

// Mock the logto config to avoid env-var errors
vi.mock('../../logto-kit/config', () => ({
  getLogtoConfig: () => ({
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    endpoint: 'https://test.logto.app',
    baseUrl: 'http://localhost:3000',
    cookieSecret: 'test-cookie-secret',
    cookieSecure: false,
    resources: [],
    scopes: [],
  }),
}));

// Mock the logger to suppress noise
vi.mock('../../logto-kit/logic/log', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

// Mock @logto/next/server-actions - the route dynamically imports this,
// so we use a factory that returns an object whose signOut we can mutate.
const signOutMockFn = vi.fn();

vi.mock('@logto/next/server-actions', () => ({
  signOut: signOutMockFn,
}));

// ── Tests ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.BASE_URL = 'http://localhost:3000';
  signOutMockFn.mockReset();
});

describe('POST /api/wipe', () => {
  it('clears all Logto cookies on normal wipe (no force)', async () => {
    const { POST } = await import('./route');
    const req = makeWipeRequest('POST', false, 'http://localhost:3000');
    const res = await POST(req);

    expect(res.status).toBe(307);

    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_refresh') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_active_org') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('clears all Logto cookies even when force=true and signOut throws NEXT_REDIRECT', async () => {
    const nextRedirectError = new Error('NEXT_REDIRECT; destination=/');
    signOutMockFn.mockRejectedValue(nextRedirectError);

    const { POST } = await import('./route');
    const req = makeWipeRequest('POST', true, 'http://localhost:3000');
    const res = await POST(req);

    expect(res.status).toBe(307);

    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_refresh') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_active_org') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('still clears cookies when force=true and signOut succeeds without throwing', async () => {
    signOutMockFn.mockResolvedValue(undefined);

    const { POST } = await import('./route');
    const req = makeWipeRequest('POST', true, 'http://localhost:3000');
    const res = await POST(req);

    expect(res.status).toBe(307);

    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_refresh') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_active_org') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('returns 403 for cross-origin POST', async () => {
    const { POST } = await import('./route');
    const req = makeWipeRequest('POST', false, 'https://evil.com');
    const res = await POST(req);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/wipe', () => {
  it('requires nonce for non-force stale-cookie recovery path', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', false);
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('validates nonce and clears cookies for non-force stale-cookie recovery path', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', false, undefined, 'nonce-123', 'nonce-123');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_refresh') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto-wipe-nonce') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('succeeds with force=true when the referer header is same-origin', async () => {
    signOutMockFn.mockResolvedValue(undefined);
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', true, undefined, undefined, undefined, 'http://localhost:3000/some-page');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('fails with 403 Forbidden with force=true when referer is cross-origin', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', true, undefined, undefined, undefined, 'https://evil.com/some-page');
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('fails with 403 Forbidden with force=true when referer is malicious, empty or absent', async () => {
    const { GET } = await import('./route');
    const req1 = makeWipeRequest('GET', true, undefined, undefined, undefined, '');
    const res1 = await GET(req1);
    expect(res1.status).toBe(403);

    const req2 = makeWipeRequest('GET', true, undefined, undefined, undefined, 'invalid-url');
    const res2 = await GET(req2);
    expect(res2.status).toBe(403);

    const req3 = makeWipeRequest('GET', true);
    const res3 = await GET(req3);
    expect(res3.status).toBe(403);
  });
});
