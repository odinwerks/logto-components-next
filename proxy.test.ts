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
    // BUG-013: secure flag is now NODE_ENV-based (not protocol-based), so
    // stub production to verify the Secure attribute is set on the wipe nonce.
    vi.stubEnv('NODE_ENV', 'production');
    getLogtoContextMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
    logMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

describe('proxy /api/wipe infinite redirect loop fix', () => {
  beforeEach(() => {
    getLogtoContextMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
    logMock.mockReset();
  });

  it('does NOT redirect to /api/wipe when already on /api/wipe (stale cookie)', async () => {
    getLogtoContextMock.mockRejectedValue(new Error('Cookies can only be modified by middleware'));

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/api/wipe?nonce=test');
    const res = await proxy(req);

    // Must NOT redirect — should pass through to the wipe route handler
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/wipe');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('does NOT redirect to /api/wipe when already on /api/wipe (invalid_grant)', async () => {
    getLogtoContextMock.mockRejectedValue({
      code: 'oidc.invalid_grant',
      message: 'Grant request is invalid.',
    });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/api/wipe?nonce=test');
    const res = await proxy(req);

    // Must NOT redirect — should pass through to the wipe route handler
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/wipe');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });
});

describe('proxy invalid_grant recovery', () => {
  beforeEach(() => {
    // BUG-013: secure flag is now NODE_ENV-based (not protocol-based), so
    // stub production to verify the Secure attribute is set on the wipe nonce.
    vi.stubEnv('NODE_ENV', 'production');
    getLogtoContextMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it('redirects protected routes to sign-in on unexpected (non-critical) Logto error', async () => {
    const unexpectedError = new Error('Database connection lost');
    getLogtoContextMock.mockRejectedValue(unexpectedError);

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/some-route');
    const res = await proxy(req);

    // BUG-H-001 fix: protected routes must redirect to sign-in (fail-closed)
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toContain('/api/auth/sign-in');

    expect(warnMock).toHaveBeenCalledWith(
      '[Proxy] Non-critical error from Logto client:',
      'Database connection lost',
    );
  });
});

describe('proxy fail-closed on unclassified errors (BUG-H-001)', () => {
  beforeEach(() => {
    getLogtoContextMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
    logMock.mockReset();
  });

  it('redirects protected routes to sign-in on unexpected Logto error', async () => {
    getLogtoContextMock.mockRejectedValue(new Error('Some unknown SDK error'));
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/api/my-account/profile');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/api/auth/sign-in');
  });

  it('allows public paths through on unexpected Logto error', async () => {
    getLogtoContextMock.mockRejectedValue(new Error('Some unknown SDK error'));
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/getting-started/pre-requisites');
    const res = await proxy(req);
    expect(res.status).not.toBe(307);
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows /demo through on unexpected Logto error', async () => {
    getLogtoContextMock.mockRejectedValue(new Error('Some unknown SDK error'));
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/demo/intro');
    const res = await proxy(req);
    expect(res.status).not.toBe(307);
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

  it('allows unauthenticated access to /getting-started/pre-requisites', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/getting-started/pre-requisites');
    const res = await proxy(req);

    // Should NOT redirect to sign-in
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows unauthenticated access to /user-button/specs', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/user-button/specs');
    const res = await proxy(req);

    // Should NOT redirect to sign-in
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows unauthenticated access to /security/error-handling (docs topic)', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/security/error-handling');
    const res = await proxy(req);

    // Should NOT redirect to sign-in
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows unauthenticated access to /api/auth/sign-in', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/api/auth/sign-in');
    const res = await proxy(req);

    // Should NOT redirect to sign-in (preventing infinite redirect loops)
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows unauthenticated access to /callback', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/callback');
    const res = await proxy(req);

    // Should NOT redirect to sign-in
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows unauthenticated access to /api/wipe', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/api/wipe');
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

  it('allows unauthenticated access to /getting-started/foo (docs topic path)', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/getting-started/foo');
    const res = await proxy(req);

    // Docs route: should NOT redirect to sign-in (fixed: was incorrectly whitelisted as /docs/*)
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('allows unauthenticated access to /dashboard (docs topic prefix)', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });

    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/dashboard');
    const res = await proxy(req);

    // 'dashboard' is a docs topic prefix — proxy allows through (app will 404 without section)
    expect(res.status).not.toBe(307);
    const location = res.headers.get('location');
    if (location) {
      expect(location).not.toContain('/api/auth/sign-in');
    }
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
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

describe('proxy CSP img-src (M1)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('omits https: wildcard from img-src and includes app/logto origins', async () => {
    vi.stubEnv('BASE_URL', 'https://app.example.com');
    vi.stubEnv('ENDPOINT', 'https://auth.example.com');
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://app.example.com/callback');
    const res = await proxy(req);
    const csp = res.headers.get('Content-Security-Policy') || '';

    // Extract just the img-src part to test it
    const imgSrcMatch = csp.match(/img-src (.+?)(?=;|$)/);
    expect(imgSrcMatch).toBeTruthy();
    const imgSrcValue = imgSrcMatch![1];

    // The old CSP had a bare "https:" wildcard which should NOT appear
    // The new CSP includes specific origins, not a bare https: wildcard
    // Note: imgSrcValue should NOT have the "img-src " prefix - it should be like "'self' data: blob: ..."
    expect(imgSrcValue).toContain("'self'");
    expect(imgSrcValue).toContain('data:');
    expect(imgSrcValue).toContain('blob:');
    expect(imgSrcValue).toContain('https://app.example.com');
    expect(imgSrcValue).toContain('https://auth.example.com');

    // Verify we have all required sources and NO bare https: wildcard
    const parts = imgSrcValue.split(' ');
    // The bare https: wildcard should NOT be present as a standalone value
    // (not as part of a full URL like https://app.example.com)
    const bareHttpsPresent = parts.some(part => part === 'https:' || part === 'https:');
    expect(bareHttpsPresent).toBe(false);

    // We have all the required sources
    expect(parts).toContain("'self'");
    expect(parts).toContain('data:');
    expect(parts).toContain('blob:');
    expect(parts).toContain('https://app.example.com');
    expect(parts).toContain('https://auth.example.com');
    // Any additional parts are allowed (IMG_ORIGIN if set)
  });

  it('includes IMG_ORIGIN origin when env var is set', async () => {
    vi.stubEnv('BASE_URL', 'https://app.example.com');
    vi.stubEnv('ENDPOINT', 'https://auth.example.com');
    vi.stubEnv('IMG_ORIGIN', 'https://cdn.example.com/images');
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://app.example.com/callback');
    const res = await proxy(req);
    const csp = res.headers.get('Content-Security-Policy') || '';

    expect(csp).toContain('https://cdn.example.com');
  });

  it('omits IMG_ORIGIN when env var is unset', async () => {
    vi.stubEnv('BASE_URL', 'https://app.example.com');
    vi.stubEnv('ENDPOINT', 'https://auth.example.com');
    // IMG_ORIGIN intentionally not set
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://app.example.com/callback');
    const res = await proxy(req);
    const csp = res.headers.get('Content-Security-Policy') || '';

    // Should have only the mandatory origins
    const imgSrcPart = csp.match(/img-src (.+?);/)?.[1] || '';
    const origins = imgSrcPart.split(' ');
    // Only 'self', data:, blob:, app origin, logto origin
    expect(origins).toHaveLength(5);
  });

  it('handles malformed IMG_ORIGIN gracefully', async () => {
    vi.stubEnv('BASE_URL', 'https://app.example.com');
    vi.stubEnv('ENDPOINT', 'https://auth.example.com');
    vi.stubEnv('IMG_ORIGIN', 'not-a-valid-url!!!');
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://app.example.com/callback');
    const res = await proxy(req);
    const csp = res.headers.get('Content-Security-Policy') || '';

    // Must still have a valid img-src (no crash)
    expect(csp).toContain("img-src 'self'");
    // Malformed origin should NOT appear
    expect(csp).not.toContain('not-a-valid-url');
  });
});

describe('proxy RSC soft-refresh gating (D12)', () => {
  beforeEach(() => {
    getLogtoContextMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
    logMock.mockReset();
  });

  it('passes through for RSC unauthenticated protected route instead of redirecting', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected', {
      headers: { RSC: '1' },
    });
    const res = await proxy(req);

    // Must NOT redirect
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
    // BUG-109: X-Auth-Expired was set but never consumed by any client code;
    // it has been removed. The pass-through itself is sufficient — server
    // components re-render with the current (expired) auth state.
    expect(res.headers.get('X-Auth-Expired')).toBeNull();
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('passes through for RSC stale-cookie instead of redirecting to /api/wipe', async () => {
    getLogtoContextMock.mockRejectedValue(new Error('Cookies can only be modified by middleware'));
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected', {
      headers: { RSC: '1' },
    });
    const res = await proxy(req);

    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('X-Auth-Expired')).toBeNull();
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('passes through for RSC invalid_grant instead of redirecting to /api/wipe', async () => {
    getLogtoContextMock.mockRejectedValue({
      code: 'oidc.invalid_grant',
      message: 'Grant request is invalid.',
    });
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected', {
      headers: { RSC: '1' },
    });
    const res = await proxy(req);

    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('X-Auth-Expired')).toBeNull();
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('passes through for RSC unexpected error on protected route instead of redirecting', async () => {
    getLogtoContextMock.mockRejectedValue(new Error('Database connection lost'));
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected', {
      headers: { RSC: '1' },
    });
    const res = await proxy(req);

    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('X-Auth-Expired')).toBeNull();
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('passes through for RSC transient error instead of 503 (BUG-105)', async () => {
    getLogtoContextMock.mockRejectedValue(new Error('fetch failed'));
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected', {
      headers: { RSC: '1' },
    });
    const res = await proxy(req);

    // Must NOT return 503 or redirect
    expect(res.status).not.toBe(503);
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
    // Pass-through so the client sees auth state change on next render cycle
    expect(res.headers.get('X-Auth-Expired')).toBeNull();
    expect(res.headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('still hard-redirects for non-RSC unauthenticated protected route', async () => {
    getLogtoContextMock.mockResolvedValue({ isAuthenticated: false });
    const { proxy } = await import('./proxy');
    const req = new NextRequest('https://example.com/protected');
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/api/auth/sign-in');
    expect(res.headers.get('X-Auth-Expired')).toBeNull();
  });
});

describe('proxy matcher excludes public static files (BUG-108)', () => {
  /**
   * The config.matcher regex is evaluated by Next.js to decide which requests
   * hit the middleware. Files in public/ are served at root-level paths
   * (e.g. public/robots.txt → /robots.txt), so the old `public/` exclusion
   * never matched any real request. We now exclude by file extension.
   *
   * Replicates how Next.js applies the matcher: new RegExp(str).test(pathname).
   */
  let matcherRegex: RegExp;

  beforeEach(async () => {
    const { config } = await import('./proxy');
    matcherRegex = new RegExp(config.matcher[0]);
  });

  function isMatchedByMiddleware(path: string): boolean {
    return matcherRegex.test(path);
  }

  it('excludes /robots.txt from middleware', () => {
    expect(isMatchedByMiddleware('/robots.txt')).toBe(false);
  });

  it('excludes /sitemap.xml from middleware', () => {
    expect(isMatchedByMiddleware('/sitemap.xml')).toBe(false);
  });

  it('excludes /manifest.json from middleware', () => {
    expect(isMatchedByMiddleware('/manifest.json')).toBe(false);
  });

  it('excludes /os-icons/Tux.jpg from middleware', () => {
    expect(isMatchedByMiddleware('/os-icons/Tux.jpg')).toBe(false);
  });

  it('excludes /os-icons/Android.svg from middleware', () => {
    expect(isMatchedByMiddleware('/os-icons/Android.svg')).toBe(false);
  });

  it('excludes /favicon.ico from middleware', () => {
    expect(isMatchedByMiddleware('/favicon.ico')).toBe(false);
  });

  it('does NOT exclude normal routes like /api/auth/sign-in', () => {
    expect(isMatchedByMiddleware('/api/auth/sign-in')).toBe(true);
  });

  it('does NOT exclude docs routes like /getting-started/pre-requisites', () => {
    expect(isMatchedByMiddleware('/getting-started/pre-requisites')).toBe(true);
  });

  it('does NOT exclude /demo/intro', () => {
    expect(isMatchedByMiddleware('/demo/intro')).toBe(true);
  });

  it('does NOT exclude /my-account', () => {
    expect(isMatchedByMiddleware('/my-account')).toBe(true);
  });
});
