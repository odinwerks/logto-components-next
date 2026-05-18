import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Build a NextRequest that mimics a browser request to /api/wipe
 * with Logto cookies present.
 */
function makeWipeRequest(
  method: 'GET' | 'POST' = 'GET',
  force = false,
  origin?: string,
): NextRequest {
  const url = `http://localhost:3000/api/wipe${force ? '?force=true' : ''}`;
  const headers: Record<string, string> = {};
  if (method === 'POST' && origin) headers.origin = origin;

  const req = new NextRequest(url, {
    method,
    headers,
  });

  // Simulate Logto cookies that should be cleared
  req.cookies.set('logto_token', 'fake-id-token-value');
  req.cookies.set('logto_refresh', 'fake-refresh-token-value');
  req.cookies.set('logto_active_org', 'org-123');

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
vi.mock('../../logto', () => ({
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

// Mock @logto/next/server-actions — the route dynamically imports this,
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

describe('GET /api/wipe', () => {
  it('clears all Logto cookies on normal wipe (no force)', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', false);
    const res = await GET(req);

    expect(res.status).toBe(307);

    const setCookies = getSetCookies(res);

    // Every Logto cookie must have a maxAge=0 Set-Cookie directive
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_refresh') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_active_org') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('clears all Logto cookies even when force=true and signOut throws NEXT_REDIRECT', async () => {
    // signOut from @logto/next/server-actions throws NEXT_REDIRECT on success.
    // BUG-H9: Before the fix, re-throwing this error caused the cookie-cleared
    // response to never reach the browser.
    const nextRedirectError = new Error('NEXT_REDIRECT; destination=/');
    signOutMockFn.mockRejectedValue(nextRedirectError);

    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', true);

    // The response should be returned (not thrown)
    const res = await GET(req);

    expect(res.status).toBe(307);

    // Cookies MUST be cleared even though signOut threw NEXT_REDIRECT
    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_refresh') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_active_org') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('still clears cookies when force=true and signOut succeeds without throwing', async () => {
    // In some edge cases signOut might not throw
    signOutMockFn.mockResolvedValue(undefined);

    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', true);
    const res = await GET(req);

    expect(res.status).toBe(307);

    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_refresh') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some(c => c.includes('logto_active_org') && c.includes('Max-Age=0'))).toBe(true);
  });
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
