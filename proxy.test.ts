import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getLogtoContextMock = vi.fn();

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
