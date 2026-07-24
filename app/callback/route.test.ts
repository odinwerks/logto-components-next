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

// Mock log — include logEvent (used by withLogger wrapper). The mock object
// is defined inside the factory to avoid vi.mock hoisting issues.
vi.mock('../logto-kit/logic/log', () => {
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

  // BUG-004: A forced-logout CSRF via the callback catch-block cookie wipe.
  // An attacker page auto-submits a cross-site GET form to
  // /callback?code=x&state=y → SameSite=Lax sends the victim's cookie →
  // handleSignIn throws `sign_in_session.not_found` (no sign-in was in
  // progress for them) → the catch block MUST NOT wipe their session.
  const makeLogtoClientError = (code: string, message = 'sign_in_session error') => {
    const err = new Error(message);
    err.name = 'LogtoClientError';
    (err as { code?: string }).code = code;
    return err;
  };

  it.each([
    ['sign_in_session.not_found', 'no sign-in in progress'],
    ['sign_in_session.invalid', 'mismatched state'],
  ])('on %s (no real sign-in in progress), redirects to / WITHOUT clearing cookies', async (code) => {
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    mockHandleSignIn.mockRejectedValueOnce(makeLogtoClientError(code));

    const request = new NextRequest('http://localhost:3000/callback?code=attacker-code&state=attacker-state');
    // Simulate a victim with an active Logto session that MUST be preserved.
    request.cookies.set('logto_session', 'victim-session');
    request.cookies.set('logto_token', 'victim-token');
    request.cookies.set('logto-active-org', 'org-123');
    request.cookies.set('logto-verification-seal', 'victim-seal');
    request.cookies.set('other_cookie', 'keep-me');

    const response = await GET(request);

    expect(mockHandleSignIn).toHaveBeenCalledTimes(1);
    // Must NOT throw NEXT_REDIRECT (no redirect() call in this branch).
    expect(mockRedirect).not.toHaveBeenCalled();

    // Redirects home, NOT to /api/auth/sign-in (which would clear tokens).
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');

    // CRITICAL: NO Logto cookies are cleared — the victim's session survives.
    const setCookie = response.headers.getSetCookie();
    expect(setCookie.some(c => c.startsWith('logto_session='))).toBe(false);
    expect(setCookie.some(c => c.startsWith('logto_token='))).toBe(false);
    expect(setCookie.some(c => c.startsWith('logto-active-org='))).toBe(false);
    expect(setCookie.some(c => c.startsWith('logto-verification-seal='))).toBe(false);
    expect(setCookie.some(c => c.startsWith('other_cookie='))).toBe(false);
    // No Set-Cookie at all in the session-preservation branch.
    expect(setCookie.length).toBe(0);
  });

  it('does NOT treat a LogtoClientError with an unrelated code as no-sign-in (still clears cookies)', async () => {
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    // A different LogtoClientError code (e.g. an idp/oidc failure) should
    // still fall through to the cookie-clearing path.
    mockHandleSignIn.mockRejectedValueOnce(makeLogtoClientError('oidc.invalid_grant', 'Grant request is invalid.'));

    const request = new NextRequest('http://localhost:3000/callback?code=stale-code&state=stale-state');
    request.cookies.set('logto_session', 'stale-session');
    request.cookies.set('logto_token', 'stale-token');

    const response = await GET(request);

    expect(mockHandleSignIn).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/api/auth/sign-in');

    // Unrelated LogtoClientError codes STILL clear cookies (only the two
    // no-sign-in codes are preserved).
    const setCookie = response.headers.getSetCookie();
    expect(setCookie.some(c => c.startsWith('logto_session=') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookie.some(c => c.startsWith('logto_token=') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('does NOT treat a plain Error (no LogtoClientError name) as no-sign-in', async () => {
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    // A plain Error that happens to carry a `code` property must NOT match —
    // the name check is the primary gate.
    const err = new Error('OAuth session not found');
    (err as { code?: string }).code = 'sign_in_session.not_found';
    mockHandleSignIn.mockRejectedValueOnce(err);

    const request = new NextRequest('http://localhost:3000/callback?code=stale-code&state=stale-state');
    request.cookies.set('logto_session', 'stale-session');

    const response = await GET(request);

    expect(response.headers.get('location')).toBe('http://localhost:3000/api/auth/sign-in');
    const setCookie = response.headers.getSetCookie();
    expect(setCookie.some(c => c.startsWith('logto_session=') && c.includes('Max-Age=0'))).toBe(true);
  });
});
