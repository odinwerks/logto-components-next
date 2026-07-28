import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInUser, signOutUser } from './auth';
import { assertSafeRouteTo } from '../assert-safe-route';
import { ValidationError } from '../validation';

vi.mock('@logto/next/server-actions', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('./verification-cookie', () => ({
  clearVerificationCookie: vi.fn().mockResolvedValue(undefined),
}));

import { signIn, signOut } from '@logto/next/server-actions';
import { clearVerificationCookie } from './verification-cookie';

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
  });

  it('completes successfully when signOut resolves', async () => {
    vi.mocked(signOut).mockResolvedValueOnce(undefined);
    await expect(signOutUser()).resolves.toBeUndefined();
  });

  it('clears the verification cookie before calling signOut (CAN-ACT-002)', async () => {
    vi.mocked(signOut).mockResolvedValueOnce(undefined);
    await signOutUser();
    expect(clearVerificationCookie).toHaveBeenCalledTimes(1);
    // clearVerificationCookie must be called BEFORE signOut so the seal is
    // cleared before the redirect throws.
    expect(vi.mocked(clearVerificationCookie).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(signOut).mock.invocationCallOrder[0]);
  });

  it('clears the verification cookie even when signOut throws NEXT_REDIRECT', async () => {
    const redirectErr = new Error('NEXT_REDIRECT');
    vi.mocked(signOut).mockRejectedValueOnce(redirectErr);
    await expect(signOutUser()).rejects.toBe(redirectErr);
    expect(clearVerificationCookie).toHaveBeenCalledTimes(1);
  });

  it('re-throws NEXT_REDIRECT errors unchanged (Next.js redirect control-flow)', async () => {
    const redirectErr = new Error('NEXT_REDIRECT');
    vi.mocked(signOut).mockRejectedValueOnce(redirectErr);
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
