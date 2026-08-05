import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('GET /api/auth/sign-in', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the canonical config base URL in the redirect fallback', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/sign-in');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://mock-module-time.com/callback');
  });

  it('does not reintroduce a double slash for a trailing-slash base URL', async () => {
    const { getLogtoConfig } = await import('../../../logto-kit/config');
    vi.mocked(getLogtoConfig).mockReturnValue({ baseUrl: 'https://my-custom-domain.com/' } as never);
    const req = new NextRequest('http://localhost:3000/api/auth/sign-in');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://my-custom-domain.com/callback');
  });
});
