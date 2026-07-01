import { describe, it, expect, vi } from 'vitest';
import { signInUser, signOutUser } from './auth';

vi.mock('@logto/next/server-actions', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { signIn, signOut } from '@logto/next/server-actions';

describe('signInUser', () => {
  it('calls signIn without options when routeTo and lang are omitted', async () => {
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

  it('forwards ui_locales extraParams when lang is provided', async () => {
    process.env.BASE_URL = 'https://example.com';
    await signInUser('/dashboard', 'ka-GE');
    expect(signIn).toHaveBeenCalledWith(expect.any(Object), {
      redirectUri: 'https://example.com/callback',
      postRedirectUri: 'https://example.com/dashboard',
      extraParams: { ui_locales: 'ka-GE' },
    });
    delete process.env.BASE_URL;
  });

  it('forwards ui_locales even when routeTo is omitted but lang is provided', async () => {
    process.env.BASE_URL = 'https://example.com';
    await signInUser(undefined, 'ka-GE');
    expect(signIn).toHaveBeenCalledWith(expect.any(Object), {
      redirectUri: 'https://example.com/callback',
      postRedirectUri: undefined,
      extraParams: { ui_locales: 'ka-GE' },
    });
    delete process.env.BASE_URL;
  });

  it('rejects absolute external URLs', async () => {
    await expect(signInUser('https://evil.com')).rejects.toThrow('Invalid routeTo');
  });

  it('rejects protocol-relative URLs', async () => {
    await expect(signInUser('//evil.com')).rejects.toThrow('Invalid routeTo');
  });
});

// ============================================================================
// BUG-L13: signOutUser error sanitization
// ============================================================================

describe('signOutUser', () => {
  it('completes successfully when signOut resolves', async () => {
    vi.mocked(signOut).mockResolvedValueOnce(undefined);
    await expect(signOutUser()).resolves.toBeUndefined();
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
