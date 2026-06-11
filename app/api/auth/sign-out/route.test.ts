import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../../../logto-kit/config', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    endpoint: 'https://auth.logto.app',
    baseUrl: 'http://localhost:3000',
    cookieSecret: 'test-cookie-secret',
    cookieSecure: false,
    resources: [],
    scopes: [],
  }),
}));

vi.mock('@logto/next/server-actions', () => ({
  signOut: vi.fn(),
}));

// Reset env before each test
beforeEach(() => {
  process.env.BASE_URL = 'http://localhost:3000';
  process.env.ENDPOINT = 'https://auth.logto.app';
  vi.clearAllMocks();
  vi.resetModules();
});

// ── POST /api/auth/sign-out ────────────────────────────────────────────────
describe('POST /api/auth/sign-out', () => {
  it('calls signOut and throws NEXT_REDIRECT on success (no origin = non-browser)', async () => {
    const { signOut } = await import('@logto/next/server-actions');
    (signOut as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('NEXT_REDIRECT')
    );

    const req = new NextRequest('http://localhost:3000/api/auth/sign-out', {
      method: 'POST',
      // No Origin header — simulates curl / non-browser clients
    });
    const { POST } = await import('./route');

    await expect(POST(req)).rejects.toThrow('NEXT_REDIRECT');
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('allows same-origin requests', async () => {
    const { signOut } = await import('@logto/next/server-actions');
    (signOut as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('NEXT_REDIRECT')
    );

    const req = new NextRequest('http://localhost:3000/api/auth/sign-out', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    const { POST } = await import('./route');

    await expect(POST(req)).rejects.toThrow('NEXT_REDIRECT');
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('rejects cross-origin requests with 403', async () => {
    const { signOut } = await import('@logto/next/server-actions');

    const req = new NextRequest('http://localhost:3000/api/auth/sign-out', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });
    const { POST } = await import('./route');
    const res = await POST(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('FORBIDDEN');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('redirects to / on signOut failure', async () => {
    const { signOut } = await import('@logto/next/server-actions');
    (signOut as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('some internal error')
    );

    const req = new NextRequest('http://localhost:3000/api/auth/sign-out', {
      method: 'POST',
    });
    const { POST } = await import('./route');
    const res = await POST(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/');
  });
});

// ── GET handler NOT present (by design) ────────────────────────────────────
describe('GET /api/auth/sign-out - no GET handler', () => {
  it('does not export a GET handler (browser-navigable GET not needed for sign-out)', async () => {
    const route = await import('./route');
    // No GET export — only POST
    expect('GET' in route).toBe(false);
  });
});
