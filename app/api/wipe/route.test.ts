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
  if (origin) headers.origin = origin;
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

// Mock the logger to suppress noise — include logEvent (used by withLogger).
// Defined inside the factory to avoid vi.mock hoisting issues.
vi.mock('../../logto-kit/logic/log', () => {
  const childLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
    raw: {},
  };
  childLogger.child.mockReturnValue(childLogger);
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    logEvent: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnValue(childLogger),
      raw: {},
    },
  };
});

// Mock @logto/next/server-actions - the route dynamically imports this,
// so we use a factory that returns an object whose signOut we can mutate.
const signOutMockFn = vi.fn();

vi.mock('@logto/next/server-actions', () => ({
  signOut: signOutMockFn,
}));

// Mock the session-wrapper — the wipe route calls deleteSessionByCookieValue
// to destroy the server-side session stored via the external session store.
const deleteSessionByCookieValueMock = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../../logto-kit/logic/session-wrapper', () => ({
  deleteSessionByCookieValue: deleteSessionByCookieValueMock,
}));

// ── Tests ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.BASE_URL = 'http://localhost:3000';
  signOutMockFn.mockReset();
  deleteSessionByCookieValueMock.mockClear();
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

  it('BUG-M6: clears verification cookie (logto-verification-seal) on normal wipe (no force)', async () => {
    const { POST } = await import('./route');
    const req = makeWipeRequest('POST', false, 'http://localhost:3000');
    // Add verification cookie to the request so it can be cleared
    req.cookies.set('logto-verification-seal', 'fake.seal.value');
    const res = await POST(req);

    expect(res.status).toBe(307);

    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto-verification-seal') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('BUG-007: clears wipe nonce cookie on POST', async () => {
    const { POST } = await import('./route');
    const req = makeWipeRequest('POST', false, 'http://localhost:3000', undefined, 'some-nonce');
    const res = await POST(req);

    expect(res.status).toBe(307);

    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto-wipe-nonce') && c.includes('Max-Age=0'))).toBe(true);
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

  it('succeeds with force=true when the Origin header is same-origin', async () => {
    signOutMockFn.mockResolvedValue(undefined);
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', true, 'http://localhost:3000');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const setCookies = getSetCookies(res);
    expect(setCookies.some(c => c.includes('logto_token') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('fails with 403 Forbidden with force=true when Origin is cross-origin', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', true, 'https://evil.com');
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it('fails with 403 Forbidden with force=true when Origin is absent', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', true);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

describe('server-side session cleanup (deleteSessionByCookieValue)', () => {
  it('GET (nonce-validated) deletes the stored session for the logto_<appId> cookie value', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', false, undefined, 'nonce-123', 'nonce-123');
    req.cookies.set('logto_test-app-id', 'session-cookie-value');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(deleteSessionByCookieValueMock).toHaveBeenCalledTimes(1);
    expect(deleteSessionByCookieValueMock).toHaveBeenCalledWith('session-cookie-value');
  });

  it('GET passes undefined when the session cookie is absent', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', false, undefined, 'nonce-123', 'nonce-123');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(deleteSessionByCookieValueMock).toHaveBeenCalledWith(undefined);
  });

  it('POST deletes the stored session for the logto_<appId> cookie value', async () => {
    const { POST } = await import('./route');
    const req = makeWipeRequest('POST', false, 'http://localhost:3000');
    req.cookies.set('logto_test-app-id', 'post-session-value');
    const res = await POST(req);

    expect(res.status).toBe(307);
    expect(deleteSessionByCookieValueMock).toHaveBeenCalledTimes(1);
    expect(deleteSessionByCookieValueMock).toHaveBeenCalledWith('post-session-value');
  });

  it('does NOT delete the session when the GET nonce check fails', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', false, undefined, 'nonce-123', 'wrong-nonce');
    req.cookies.set('logto_test-app-id', 'session-cookie-value');
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(deleteSessionByCookieValueMock).not.toHaveBeenCalled();
  });

  it('does NOT delete the session when the GET nonce is missing entirely', async () => {
    const { GET } = await import('./route');
    const req = makeWipeRequest('GET', false);
    req.cookies.set('logto_test-app-id', 'session-cookie-value');
    const res = await GET(req);

    expect(res.status).toBe(403);
    expect(deleteSessionByCookieValueMock).not.toHaveBeenCalled();
  });

  it('does NOT delete the session on a cross-origin POST', async () => {
    const { POST } = await import('./route');
    const req = makeWipeRequest('POST', false, 'https://evil.com');
    req.cookies.set('logto_test-app-id', 'session-cookie-value');
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(deleteSessionByCookieValueMock).not.toHaveBeenCalled();
  });
});
