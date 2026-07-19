import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    const err = new Error('NEXT_REDIRECT');
    (err as { digest?: string }).digest = `NEXT_REDIRECT;${url}`;
    throw err;
  },
}));

// Mock @logto/next/server-actions
const mockHandleSignIn = vi.fn();
vi.mock('@logto/next/server-actions', () => ({
  handleSignIn: (...args: unknown[]) => mockHandleSignIn(...args),
}));

// Mock config
vi.mock('../logto-kit/config', () => ({
  getLogtoConfig: () => ({ appId: 'test' }),
}));

// Mock log
vi.mock('../logto-kit/logic/log', () => ({
  error: vi.fn(),
}));

import { GET } from './route';

describe('Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles safe OAuth error codes and redirects safely', async () => {
    const request = new NextRequest('http://localhost:3000/callback?error=access_denied');
    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/?auth_error=access_denied');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockHandleSignIn).not.toHaveBeenCalled();
  });

  it('filters out unsafe/unknown error codes and redirects to unknown_error', async () => {
    const request = new NextRequest('http://localhost:3000/callback?error=https://evil.com/redirect');
    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/?auth_error=unknown_error');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockHandleSignIn).not.toHaveBeenCalled();
  });

  it('normal path (no error) calls handleSignIn and redirects to /', async () => {
    const request = new NextRequest('http://localhost:3000/callback?code=some-code&state=some-state');
    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT');

    expect(mockHandleSignIn).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it('re-throws NEXT_REDIRECT from handleSignIn (SDK internal redirect)', async () => {
    mockHandleSignIn.mockImplementationOnce(() => {
      const err = new Error('NEXT_REDIRECT');
      (err as { digest?: string }).digest = 'NEXT_REDIRECT;https://logto/oidc';
      throw err;
    });
    const request = new NextRequest('http://localhost:3000/callback?code=some-code&state=some-state');
    await expect(GET(request)).rejects.toThrow('NEXT_REDIRECT');

    expect(mockHandleSignIn).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('on handleSignIn failure, clears Logto cookies and redirects to /api/auth/sign-in', async () => {
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    mockHandleSignIn.mockRejectedValueOnce(new Error('OAuth session not found'));

    const request = new NextRequest('http://localhost:3000/callback?code=stale-code&state=stale-state');
    // Simulate Logto SDK cookies present on the request.
    request.cookies.set('logto_session', 'stale-session');
    request.cookies.set('logto_token', 'stale-token');
    request.cookies.set('logto-active-org', 'org-123');
    request.cookies.set('logto-verification-seal', 'stale-seal');
    request.cookies.set('other_cookie', 'keep-me');

    const response = await GET(request);

    expect(mockHandleSignIn).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();

    // Should redirect to sign-in.
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/api/auth/sign-in');

    // Logto cookies should be cleared.
    const setCookie = response.headers.getSetCookie();
    expect(setCookie.some(c => c.startsWith('logto_session=') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookie.some(c => c.startsWith('logto_token=') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookie.some(c => c.startsWith('logto-active-org=') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookie.some(c => c.startsWith('logto-verification-seal=') && c.includes('Max-Age=0'))).toBe(true);
    // Non-Logto cookies should NOT be touched.
    expect(setCookie.some(c => c.startsWith('other_cookie='))).toBe(false);
  });
});
