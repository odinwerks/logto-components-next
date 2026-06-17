import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getLogtoContextMock = vi.fn();
const warnMock = vi.fn();
const errorMock = vi.fn();

vi.mock('@logto/next/edge', () => ({
  default: class MockLogtoClient {
    getLogtoContext = getLogtoContextMock;
  },
}));

vi.mock('./app/logto-kit/config', () => ({
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

const logMock = vi.fn();

vi.mock('./app/logto-kit/logic/log', () => ({
  warn: warnMock,
  error: errorMock,
  log: logMock,
}));

function getSetCookies(res: Response): string[] {
  const setCookies: string[] = [];
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') setCookies.push(value);
  });
  return setCookies;
}

describe('proxy stale-cookie recovery', () => {
  beforeEach(() => {
    getLogtoContextMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
    logMock.mockReset();
  });

  it('issues nonce contract for stale-cookie branch redirect', async () => {
    getLogtoContextMock.mockRejectedValue(new Error('Cookies can only be modified by middleware'));

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected');
    const res = await proxy(req);

    expect(res.status).toBe(307);

    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location!, req.url);
    expect(redirectUrl.pathname).toBe('/api/wipe');
    const nonce = redirectUrl.searchParams.get('nonce');
    expect(nonce).toBeTruthy();

    const setCookies = getSetCookies(res);
    const nonceCookie = setCookies.find(cookie => cookie.includes('logto-wipe-nonce='));
    expect(nonceCookie).toBeTruthy();
    const nonceCookieHeader = nonceCookie!;
    expect(nonceCookieHeader).toContain(`logto-wipe-nonce=${nonce}`);
    expect(nonceCookieHeader).toContain('HttpOnly');
    expect(nonceCookieHeader).toMatch(/SameSite=lax/i);
    expect(nonceCookieHeader).toContain('Path=/');
    expect(nonceCookieHeader).toContain('Max-Age=60');
    expect(nonceCookieHeader).toContain('Secure');
  });
});

describe('proxy invalid_grant recovery', () => {
  beforeEach(() => {
    getLogtoContextMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
  });

  it('issues nonce contract for invalid_grant redirect', async () => {
    getLogtoContextMock.mockRejectedValue({
      code: 'oidc.invalid_grant',
      message: 'Grant request is invalid.',
    });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected');
    const res = await proxy(req);

    expect(res.status).toBe(307);

    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location!, req.url);
    expect(redirectUrl.pathname).toBe('/api/wipe');
    const nonce = redirectUrl.searchParams.get('nonce');
    expect(nonce).toBeTruthy();

    const setCookies = getSetCookies(res);
    const nonceCookie = setCookies.find(cookie => cookie.includes('logto-wipe-nonce='));
    expect(nonceCookie).toBeTruthy();
    const nonceCookieHeader = nonceCookie!;
    expect(nonceCookieHeader).toContain(`logto-wipe-nonce=${nonce}`);
    expect(nonceCookieHeader).toContain('HttpOnly');
    expect(nonceCookieHeader).toMatch(/SameSite=lax/i);
    expect(nonceCookieHeader).toContain('Path=/');
    expect(nonceCookieHeader).toContain('Max-Age=60');
    expect(nonceCookieHeader).toContain('Secure');

    expect(warnMock).toHaveBeenCalledWith(
      '[Proxy] invalid_grant detected, redirecting to wipe:',
      expect.any(String),
    );
  });
});

describe('proxy error classification and logging', () => {
  beforeEach(() => {
    getLogtoContextMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
  });

  it('handles transient errors by returning 503 and logging warn', async () => {
    const transientError = new Error('fetch failed');
    getLogtoContextMock.mockRejectedValue(transientError);

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected');
    const res = await proxy(req);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: 'SERVICE_UNAVAILABLE' });

    expect(warnMock).toHaveBeenCalledWith(
      '[Proxy] Transient error, returning 503:',
      'fetch failed',
    );
  });

  it('allows through on non-critical Logto client errors and logs a warning', async () => {
    const unexpectedError = new Error('Database connection lost');
    getLogtoContextMock.mockRejectedValue(unexpectedError);

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/some-route');
    const res = await proxy(req);

    // Should pass through (not redirect to sign-in)
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }

    // CSP should still be set
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();

    expect(warnMock).toHaveBeenCalledWith(
      '[Proxy] Non-critical error from Logto client, allowing request through:',
      'Database connection lost',
    );
  });
});

describe('proxy choke-point: public vs protected routes', () => {
  beforeEach(() => {
    getLogtoContextMock.mockReset();
  });

  it('allows unauthenticated access to / (landing page)', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/');
    const res = await proxy(req);

    // Should NOT redirect to sign-in
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows unauthenticated access to /demo/foo', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/demo/foo');
    const res = await proxy(req);

    // Should NOT redirect to sign-in
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows unauthenticated access to /docs/foo', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/docs/foo');
    const res = await proxy(req);

    // Should NOT redirect to sign-in
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('redirects unauthenticated access to /api/foo to sign-in', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/api/foo');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toContain('/api/auth/sign-in');
  });

  it('redirects unauthenticated access to /random/foo to sign-in', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/random/foo');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toContain('/api/auth/sign-in');
  });

  it('redirects unauthenticated access to /getting-started/foo to sign-in', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/getting-started/foo');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toContain('/api/auth/sign-in');
  });

  it('redirects unauthenticated access to /dashboard to sign-in', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/dashboard');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toContain('/api/auth/sign-in');
  });

  it('allows authenticated access to any route', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: true, userInfo: { sub: 'user123' } });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/dashboard');
    const res = await proxy(req);

    expect(res.status).not.toBe(307);
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });
});

describe('proxy CSP fixes', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('BUG-M-002: generates a canonical base64url 16-byte random nonce', async () => {
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/callback');
    const res = await proxy(req);

    // Extract CSP and nonce
    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toBeTruthy();
    
    const nonceMatch = csp!.match(/nonce-([a-zA-Z0-9_-]+)/);
    expect(nonceMatch).toBeTruthy();
    const nonce = nonceMatch![1];

    // Canonical 16-byte base64url should be 22 chars and only have base64url chars (no +, /, or =)
    expect(nonce.length).toBe(22);
    expect(nonce).not.toContain('+');
    expect(nonce).not.toContain('/');
    expect(nonce).not.toContain('=');
  });

  it('BUG-M-003: connect-src does not contain bare wss: wildcard in production, and contains scoped ws/wss localhost in development', async () => {
    const { proxy } = await import('./proxy');

    // Test production env (or non-development)
    vi.stubEnv('NODE_ENV', 'production');
    const reqProd = new NextRequest('https://example.com/callback');
    const resProd = await proxy(reqProd);
    const cspProd = resProd.headers.get('Content-Security-Policy') || '';
    expect(cspProd).not.toContain('wss:');
    expect(cspProd).not.toContain('ws:');

    // Test development env
    vi.stubEnv('NODE_ENV', 'development');
    const reqDev = new NextRequest('https://example.com/callback');
    const resDev = await proxy(reqDev);
    const cspDev = resDev.headers.get('Content-Security-Policy') || '';
    expect(cspDev).toContain('ws://localhost:* wss://localhost:*');
    expect(cspDev).not.toMatch(/\bwss:\b/); // should not contain bare wss:
  });
});
