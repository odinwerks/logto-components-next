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
});
