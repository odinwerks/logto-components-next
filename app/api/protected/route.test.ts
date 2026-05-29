import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getAction } from '../../logto-kit/action-registry';

vi.mock('../../logto-kit/logic/actions/tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('@logto/next/server-actions', () => ({
  getAccessToken: vi.fn().mockResolvedValue('mock-token'),
  getOrganizationToken: vi.fn().mockResolvedValue('mock-org-token'),
  getLogtoContext: vi.fn().mockResolvedValue({
    isAuthenticated: true,
    claims: { sub: 'mock-user-id' },
    userInfo: {
      sub: 'mock-user-id',
      organizations: [],
      custom_data: { Preferences: { asOrg: null } },
    },
  }),
}));

vi.mock('../../logto-kit/logic/utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://example.com'),
  introspectToken: vi.fn().mockResolvedValue({
    active: true,
    sub: 'mock-user-id',
    jti: 'mock-jti',
  }),
}));

vi.mock('../../logto-kit/action-registry', () => ({
  getAction: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../logto-kit/logic/actions', () => ({
  getOrganizationUserPermissions: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock('../../logto-kit/action-registry/validation', () => ({
  validateOrgMembership: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../../logto-kit/config', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    endpoint: 'https://test.logto.app',
    baseUrl: 'http://localhost:3000',
    cookieSecret: 'test-cookie-secret',
    cookieSecure: false,
    resources: [],
    scopes: [],
  }),
  logtoConfig: {
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    endpoint: 'https://test.logto.app',
    baseUrl: 'http://localhost:3000',
    cookieSecret: 'test-cookie-secret',
    cookieSecure: false,
    resources: [],
    scopes: [],
  },
}));

// Reset env before each test since checkSameOrigin reads process.env.BASE_URL
beforeEach(() => {
  process.env.BASE_URL = 'http://localhost:3000';
  delete process.env.APP_URL;
  vi.clearAllMocks();
  vi.resetModules();
});

describe('POST /api/protected — CSRF protection', () => {
  it('returns 403 for cross-origin POST (blocks before body parsing)', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });

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
      body: JSON.stringify({ action: 'test' }),
    });

    const { POST } = await import('./route');
    const res = await POST(req);

    expect(res.status).not.toBe(403);
  });
});

describe('POST /api/protected — asOrg null guard', () => {
  it('returns 403 PERMISSION_DENIED when asOrg is null despite org validation passing', async () => {
    // Override getAction to return a valid config so the code path reaches the permission check
    (getAction as any).mockResolvedValue({
      name: 'test-action',
      requiredPerm: ['test:read'],
      handler: vi.fn().mockResolvedValue({ success: true }),
    });

    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'test-action' }),
    });

    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('PERMISSION_DENIED');
    expect(body.message).toBe('Active organization is required');
  });
});
