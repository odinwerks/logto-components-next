import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInUser, signOutUser } from './auth';
import { assertSafeRouteTo } from '../assert-safe-route';
import { ValidationError } from '../validation';

const cookieMocks = vi.hoisted(() => {
  const getAll = vi.fn();
  const set = vi.fn();
  const cookieStore = { getAll, set };

  return {
    getAll,
    set,
    cookieStore,
    cookies: vi.fn(),
  };
});

vi.mock('@logto/next/server-actions', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: cookieMocks.cookies,
}));

import { signIn, signOut } from '@logto/next/server-actions';

describe('signInUser', () => {
  it('calls signIn without postRedirectUri when routeTo is omitted', async () => {
    await signInUser();
    expect(signIn).toHaveBeenCalledWith(expect.any(Object), undefined);
  });

  it('calls signIn with postRedirectUri built from BASE_URL and routeTo', async () => {
    process.env.BASE_URL = 'https://example.com';
    await signInUser('/docs/foo');
    expect(signIn).toHaveBeenCalledWith(expect.any(Object), {
      redirectUri: 'https://example.com/callback',
      postRedirectUri: 'https://example.com/docs/foo',
    });
    delete process.env.BASE_URL;
  });

  it('rejects absolute external URLs', async () => {
    await expect(signInUser('https://evil.com')).rejects.toThrow('INVALID_ROUTE');
  });

  it('rejects protocol-relative URLs', async () => {
    await expect(signInUser('//evil.com')).rejects.toThrow('INVALID_ROUTE');
  });

  // BUG-010 regression: backslash-prefixed hosts bypass the old startsWith('//')
  // check because the WHATWG URL parser normalises `\` to `/` inside special
  // schemes. The origin-equality fix rejects these.
  it('rejects backslash-prefixed hosts (BUG-010)', async () => {
    await expect(signInUser('/\\evil.com')).rejects.toThrow('INVALID_ROUTE');
  });

  it('rejects backslash-at-prefixed hosts (BUG-010)', async () => {
    await expect(signInUser('/\\@evil.com')).rejects.toThrow('INVALID_ROUTE');
  });

  it('allows same-origin relative paths', () => {
    expect(() => assertSafeRouteTo('/dashboard', 'https://example.com')).not.toThrow();
    expect(() => assertSafeRouteTo('/docs/foo', 'http://localhost:3000')).not.toThrow();
  });

  it('throws ValidationError on invalid route', () => {
    try {
      assertSafeRouteTo('https://evil.com', 'https://example.com');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as Error).message).toBe('INVALID_ROUTE');
    }
  });

  // ============================================================================
  // BUG-013: signInUser error sanitization
  //
  // signInUser must mirror signOutUser's try/catch: re-throw NEXT_REDIRECT
  // control-flow pseudo-errors unchanged, but sanitize every other error to a
  // fixed INTERNAL_ERROR code so SDK internals / malformed-BASE_URL TypeErrors
  // never leak across the Server Action boundary to the browser.
  // ============================================================================

  it('re-throws NEXT_REDIRECT errors unchanged (Next.js redirect control-flow)', async () => {
    const redirectErr = new Error('NEXT_REDIRECT');
    vi.mocked(signIn).mockRejectedValueOnce(redirectErr);
    await expect(signInUser()).rejects.toBe(redirectErr);
  });

  it('re-throws NEXT_REDIRECT by digest property', async () => {
    const redirectErr = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/;304;',
    });
    vi.mocked(signIn).mockRejectedValueOnce(redirectErr);
    await expect(signInUser()).rejects.toBe(redirectErr);
  });

  it('sanitizes non-redirect errors to INTERNAL_ERROR (BUG-013)', async () => {
    const internalErr = new Error('SDK internal: sign-in initiation failed with secret details');
    vi.mocked(signIn).mockRejectedValueOnce(internalErr);
    await expect(signInUser()).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'INTERNAL_ERROR',
    });
  });

  it('sanitizes string-thrown errors to INTERNAL_ERROR', async () => {
    vi.mocked(signIn).mockRejectedValueOnce('something went wrong');
    await expect(signInUser()).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'INTERNAL_ERROR',
    });
  });
});

// ============================================================================
// BUG-L13: signOutUser error sanitization
// ============================================================================

describe('signOutUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(signOut).mockResolvedValue(undefined);
    cookieMocks.getAll.mockReturnValue([
      { name: 'logto_test-app', value: 'encrypted-session' },
      { name: 'logto-active-org', value: 'org-123' },
      { name: 'logto-verification-seal', value: 'sealed-verification' },
      { name: 'theme', value: 'dark' },
    ]);
    cookieMocks.set.mockImplementation(() => undefined);
    cookieMocks.cookies.mockResolvedValue(cookieMocks.cookieStore);
  });

  it('completes successfully when signOut resolves', async () => {
    vi.mocked(signOut).mockResolvedValueOnce(undefined);
    await expect(signOutUser()).resolves.toBeUndefined();
    expect(cookieMocks.set).toHaveBeenCalledWith(
      'logto_test-app',
      '',
      { maxAge: 0, path: '/' },
    );
    expect(vi.mocked(signOut).mock.invocationCallOrder[0])
      .toBeLessThan(cookieMocks.cookies.mock.invocationCallOrder[0]);
  });

  it('clears local Logto cookies and reports the SDK error when signOut fails pre-clear', async () => {
    vi.mocked(signOut).mockRejectedValueOnce(
      new Error('SDK discovery failed before clearing the session'),
    );

    await expect(signOutUser()).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'INTERNAL_ERROR',
    });
    expect(cookieMocks.set).toHaveBeenCalledWith(
      'logto_test-app',
      '',
      { maxAge: 0, path: '/' },
    );
    expect(cookieMocks.set).toHaveBeenCalledWith(
      'logto-active-org',
      '',
      { maxAge: 0, path: '/' },
    );
    expect(cookieMocks.set).toHaveBeenCalledWith(
      'logto-verification-seal',
      '',
      { maxAge: 0, path: '/' },
    );
    expect(cookieMocks.set).not.toHaveBeenCalledWith(
      'theme',
      expect.anything(),
      expect.anything(),
    );
  });

  it('preserves the original signOut failure when local cleanup also fails', async () => {
    const cleanupErr = new Error('cookie jar unavailable');
    vi.mocked(signOut).mockRejectedValueOnce(new Error('SDK discovery failed'));
    cookieMocks.cookies.mockRejectedValueOnce(cleanupErr);

    await expect(signOutUser()).rejects.toSatisfy((err: unknown) => (
      err instanceof Error &&
      err !== cleanupErr &&
      err.name === 'SanitizedError' &&
      err.message === 'INTERNAL_ERROR'
    ));
  });

  it('does not surface local cleanup failure after successful signOut', async () => {
    vi.mocked(signOut).mockResolvedValueOnce(undefined);
    cookieMocks.cookies.mockRejectedValueOnce(new Error('cookie jar unavailable'));

    await expect(signOutUser()).resolves.toBeUndefined();
  });

  it('re-throws NEXT_REDIRECT errors unchanged (Next.js redirect control-flow)', async () => {
    const redirectErr = new Error('NEXT_REDIRECT');
    vi.mocked(signOut).mockRejectedValueOnce(redirectErr);
    await expect(signOutUser()).rejects.toBe(redirectErr);
    expect(cookieMocks.set).toHaveBeenCalledWith(
      'logto_test-app',
      '',
      { maxAge: 0, path: '/' },
    );
  });

  it('does not mask NEXT_REDIRECT when local cleanup fails', async () => {
    const redirectErr = new Error('NEXT_REDIRECT');
    vi.mocked(signOut).mockRejectedValueOnce(redirectErr);
    cookieMocks.cookies.mockRejectedValueOnce(new Error('cookie cleanup failed'));

    await expect(signOutUser()).rejects.toBe(redirectErr);
  });

  it('re-throws NEXT_REDIRECT by digest property', async () => {
    const redirectErr = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/;304;',
    });
    vi.mocked(signOut).mockRejectedValueOnce(redirectErr);
    await expect(signOutUser()).rejects.toBe(redirectErr);
  });

  it('sanitizes non-redirect errors to INTERNAL_ERROR (BUG-L13)', async () => {
    const internalErr = new Error('SDK internal: token refresh failed with secret details');
    vi.mocked(signOut).mockRejectedValueOnce(internalErr);
    await expect(signOutUser()).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'INTERNAL_ERROR',
    });
  });

  it('sanitizes string-thrown errors to INTERNAL_ERROR', async () => {
    vi.mocked(signOut).mockRejectedValueOnce('something went wrong');
    await expect(signOutUser()).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'INTERNAL_ERROR',
    });
  });
});
