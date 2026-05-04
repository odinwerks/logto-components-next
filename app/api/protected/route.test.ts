import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Reset env before each test since checkSameOrigin reads process.env.BASE_URL
beforeEach(() => {
  process.env.BASE_URL = 'http://localhost:3000';
  delete process.env.APP_URL;
});

describe('POST /api/protected — CSRF protection', () => {
  it('returns 403 for cross-origin POST (blocks before body parsing)', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });

    // Dynamic import so BASE_URL is set before the module evaluates
    const { POST } = await import('./route');
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 403 when Origin header is missing (fail-closed)', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
    });

    const { POST } = await import('./route');
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('allows same-origin POST (returns non-403, reaching handler body)', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'test', id: 'test', action: 'test' }),
    });

    const { POST } = await import('./route');
    const res = await POST(req);

    // Should NOT be 403 — origin check passes, handler proceeds
    // (will likely fail at token introspection, but that's fine — 403 means CSRF blocked)
    expect(res.status).not.toBe(403);
  });
});
