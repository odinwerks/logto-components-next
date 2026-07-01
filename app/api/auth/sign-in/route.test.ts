import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@logto/next/server-actions', () => ({
  signIn: vi.fn(), // signIn doesn't throw in mock, allowing us to test fallback
}));

vi.mock('../../../logto-kit/config', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({
    baseUrl: 'http://mock-module-time.com',
  }),
}));

const cookieValueRef = { current: undefined as string | undefined };

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockImplementation((name: string) =>
      name === 'lang-mode' && cookieValueRef.current !== undefined
        ? { value: cookieValueRef.current }
        : undefined
    ),
  }),
}));

import { signIn } from '@logto/next/server-actions';

describe('GET /api/auth/sign-in', () => {
  beforeEach(() => {
    cookieValueRef.current = undefined;
    vi.mocked(signIn).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('BUG-L-002: uses BASE_URL env var in redirect URL when signIn does not throw', async () => {
    vi.stubEnv('BASE_URL', 'https://my-custom-domain.com');
    const req = new NextRequest('http://localhost:3000/api/auth/sign-in');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://my-custom-domain.com/callback');
  });

  it('uses http://localhost:3000 fallback when BASE_URL is not set', async () => {
    vi.stubEnv('BASE_URL', '');
    const req = new NextRequest('http://localhost:3000/api/auth/sign-in');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/callback');
  });

  it('calls signIn without options when no lang-mode cookie is present', async () => {
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    const req = new NextRequest('http://localhost:3000/api/auth/sign-in');
    await GET(req);

    expect(signIn).toHaveBeenCalledWith(expect.any(Object), undefined);
  });

  it('forwards ui_locales extraParams when lang-mode cookie is set', async () => {
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    cookieValueRef.current = 'ka-GE';
    const req = new NextRequest('http://localhost:3000/api/auth/sign-in');
    await GET(req);

    expect(signIn).toHaveBeenCalledWith(expect.any(Object), {
      redirectUri: 'http://mock-module-time.com/callback',
      extraParams: { ui_locales: 'ka-GE' },
    });
  });
});
