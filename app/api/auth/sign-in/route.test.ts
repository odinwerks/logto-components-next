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
});