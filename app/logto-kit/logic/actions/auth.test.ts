import { describe, it, expect, vi } from 'vitest';
import { signInUser } from './auth';

vi.mock('@logto/next/server-actions', () => ({
  signIn: vi.fn(),
}));

import { signIn } from '@logto/next/server-actions';

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
    await expect(signInUser('https://evil.com')).rejects.toThrow('Invalid routeTo');
  });

  it('rejects protocol-relative URLs', async () => {
    await expect(signInUser('//evil.com')).rejects.toThrow('Invalid routeTo');
  });
});
