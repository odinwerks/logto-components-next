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

  it('handles auth errors by redirecting to sign-in and logging error', async () => {
    const authError = new Error('needsAuth');
    getLogtoContextMock.mockRejectedValue(authError);

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/api/auth/sign-in');

    expect(errorMock).toHaveBeenCalledWith(
      '[Proxy] Auth error, redirecting to sign-in:',
      'needsAuth',
    );
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

  it('handles unexpected errors by redirecting to sign-in and logging error', async () => {
    const unexpectedError = new Error('Database connection lost');
    getLogtoContextMock.mockRejectedValue(unexpectedError);

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/api/auth/sign-in');

    expect(errorMock).toHaveBeenCalledWith(
      '[Proxy] Unexpected error, redirecting to sign-in:',
      'Database connection lost',
    );
  });
});

describe('proxy public paths whitelist', () => {
  beforeEach(() => {
    getLogtoContextMock.mockReset();
  });

  it.each([
    // Auth routes (pre-existing)
    ['/callback'],
    ['/api/auth/sign-in'],
    ['/api/wipe'],
    // Getting Started docs
    ['/getting-started/pre-requisites'],
    ['/getting-started/clone-install'],
    ['/getting-started/env-setup'],
    ['/getting-started/backend-selection'],
    ['/getting-started/avatar-upload'],
    ['/getting-started/logto-console'],
    ['/getting-started/replace-the-demo'],
    // UserButton demo
    ['/user-button/specs'],
    ['/user-button/examples'],
    // Dashboard docs
    ['/dashboard/internals'],
    ['/dashboard/provider-sync'],
    ['/dashboard/tab-structure'],
    ['/dashboard/rendering'],
    ['/dashboard/mobile'],
    // Tabs & Flows docs
    ['/tabs-and-flows/overview'],
    ['/tabs-and-flows/profile'],
    ['/tabs-and-flows/preferences'],
    ['/tabs-and-flows/security'],
    ['/tabs-and-flows/sessions'],
    ['/tabs-and-flows/identities'],
    ['/tabs-and-flows/organizations'],
    // RBAC demo
    ['/rbac/ui-protected'],
    ['/rbac/api'],
    // Calculator demo
    ['/calculator/overview'],
    ['/calculator/rbac-design'],
    ['/calculator/api-authorization'],
    ['/calculator/live-demo'],
    // Anatomy docs
    ['/anatomy/providers'],
    ['/anatomy/theme'],
    ['/anatomy/i18n'],
    ['/anatomy/primitives'],
    ['/anatomy/async-patterns'],
    // Security docs
    ['/security/error-handling'],
    ['/security/input-guards'],
    ['/security/logging'],
  ])('allows unauthenticated access to public path: %s', async (publicPath) => {
    const { proxy } = await import('./proxy');
    const req = new NextRequest(`https://example.com${publicPath}`);
    const res = await proxy(req);

    // Should not redirect to sign-in (200 or any non-307 to /api/auth/sign-in)
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }

    // CSP should still be set
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();

    // getLogtoContext should NOT have been called (skipped for public paths)
    expect(getLogtoContextMock).not.toHaveBeenCalled();
  });

  it('allows unauthenticated access to public path with trailing slash', async () => {
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/getting-started/pre-requisites/');
    const res = await proxy(req);

    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(getLogtoContextMock).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated access to non-public route to sign-in', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected-route');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/api/auth/sign-in');
  });

  it('does not whitelist unlisted routes under known topics', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    // /getting-started/unknown-section is NOT in PUBLIC_PATHS
    const req = new NextRequest('https://example.com/getting-started/unknown-section');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/api/auth/sign-in');
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