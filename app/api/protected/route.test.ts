import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getAction } from '../../logto-kit/action-registry';

vi.mock('../../logto-kit/logic/actions/tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('../../logto-kit/logic/utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://example.com'),
  introspectToken: vi.fn().mockResolvedValue({
    active: true,
    sub: 'mock-user-id',
    client_id: 'test-app-id',
    jti: 'mock-jti',
  }),
}));

vi.mock('../../logto-kit/action-registry', () => ({
  getAction: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../logto-kit/logic/actions', () => ({
  verifyOrgAccess: vi.fn().mockResolvedValue({
    ok: true,
    data: { roles: [], permissions: [] },
  }),
  verifyPersonalAccess: vi.fn().mockResolvedValue({
    ok: true,
    data: { roles: [], permissions: [] },
  }),
  getUserRoles: vi.fn().mockResolvedValue({
    ok: true,
    data: [],
  }),
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
  getManagementApiToken: vi.fn().mockResolvedValue('mock-m2m-token'),
}));

// Reset env before each test since checkSameOrigin reads process.env.BASE_URL
beforeEach(() => {
  process.env.BASE_URL = 'http://localhost:3000';
  delete process.env.APP_URL;
  delete process.env.PROTECTED_ALLOW_BEARER_FALLBACK;
  vi.clearAllMocks();
  vi.resetModules();
});

// ── Helper for building same-origin requests ────────────────────────────────
function makeRequest(body: object): NextRequest {
  const bodyStr = JSON.stringify(body);
  return new NextRequest('http://localhost:3000/api/protected', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      'content-length': String(Buffer.from(bodyStr).length),
    },
    body: bodyStr,
  });
}

// ── CSRF protection ─────────────────────────────────────────────────────────
describe('POST /api/protected - CSRF protection', () => {
  it('returns 403 for cross-origin POST', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: {
        origin: 'https://evil.com',
        'content-length': '0',
      },
    });
    const { POST } = await import('./route');
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when Origin header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: {
        'content-length': '0',
      },
    });
    const { POST } = await import('./route');
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('allows same-origin POST', async () => {
    const req = makeRequest({ action: 'test' });
    const { POST } = await import('./route');
    const res = await POST(req);
    expect(res.status).not.toBe(403);
  });
});

// ── Action resolution ───────────────────────────────────────────────────────
describe('POST /api/protected - action resolution', () => {
  it('returns 401 UNAUTHORIZED when session token retrieval fails', async () => {
    const { getTokenForServerAction } = await import('../../logto-kit/logic/actions/tokens');
    (getTokenForServerAction as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('missing session token'));

    const req = makeRequest({ action: 'some-action' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('UNAUTHORIZED');
    expect(body.data).toBeNull();
  });

  it('returns 404 when action is not found', async () => {
    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const req = makeRequest({ action: 'missing-action' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('ACTION_NOT_FOUND');
    expect(body.data).toBeNull();
  });
});

// ── Action config validation ────────────────────────────────────────────────
describe('POST /api/protected - config validation', () => {
  it('returns 500 IMPROPER_SETUP_ERROR when requiredOrgId is missing', async () => {
    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredRoleId: 'role-1',
      requiredPermId: 'perm:1',
      handler: vi.fn(),
    });

    const req = makeRequest({ action: 'bad-config' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('IMPROPER_SETUP_ERROR');
  });

  it('returns 500 IMPROPER_SETUP_ERROR when requiredRoleId is empty', async () => {
    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'self',
      requiredRoleId: [],
      requiredPermId: 'perm:1',
      handler: vi.fn(),
    });

    const req = makeRequest({ action: 'bad-config' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('IMPROPER_SETUP_ERROR');
  });

  it('returns 500 IMPROPER_SETUP_ERROR when requiredPermId is empty', async () => {
    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'self',
      requiredRoleId: 'role-1',
      requiredPermId: [],
      handler: vi.fn(),
    });

    const req = makeRequest({ action: 'bad-config' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('IMPROPER_SETUP_ERROR');
  });
});

// ── Personal RBAC (self bypass) ─────────────────────────────────────────────
describe('POST /api/protected - personal RBAC (self bypass)', () => {
  it('returns 403 ROLE_DENIED when user lacks the required personal role', async () => {
    const { verifyPersonalAccess } = await import('../../logto-kit/logic/actions');
    (verifyPersonalAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      data: {
        roles: [{ id: 'other-role', name: 'Other Role' }],
        permissions: ['calc:basic'],
      },
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'self',
      requiredRoleId: 'calc-user-role-id',
      requiredPermId: 'calc:basic',
      handler: vi.fn().mockResolvedValue({ answer: 42 }),
    });

    const req = makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('ROLE_DENIED');
  });

  it('returns 403 PERMISSION_DENIED when user lacks the required personal permission', async () => {
    const { verifyPersonalAccess } = await import('../../logto-kit/logic/actions');
    (verifyPersonalAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      data: {
        roles: [{ id: 'calc-user-role-id', name: 'Calc User' }],
        permissions: [],
      },
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'self',
      requiredRoleId: 'calc-user-role-id',
      requiredPermId: 'calc:basic',
      handler: vi.fn().mockResolvedValue({ answer: 42 }),
    });

    const req = makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('PERMISSION_DENIED');
  });

  it('returns the answer when personal RBAC passes (both role and permission present)', async () => {
    const { verifyPersonalAccess } = await import('../../logto-kit/logic/actions');
    (verifyPersonalAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      data: {
        roles: [{ id: 'calc-user-role-id', name: 'Calc User' }],
        permissions: ['calc:basic'],
      },
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'self',
      requiredRoleId: 'calc-user-role-id',
      requiredPermId: 'calc:basic',
      handler: vi.fn().mockResolvedValue({ answer: 3 }),
    });

    const req = makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ answer: 3 });
  });

  it('returns 401 UNAUTHORIZED when personal verifier reports principal mismatch in compatibility mode', async () => {
    const { verifyPersonalAccess } = await import('../../logto-kit/logic/actions');
    (verifyPersonalAccess as ReturnType<typeof vi.fn>).mockImplementationOnce(async (expectedPrincipal?: { sub?: string }) => {
      if (expectedPrincipal?.sub === 'mock-user-id') {
        return { ok: false, error: 'UNAUTHORIZED' };
      }

      return {
        ok: true,
        data: {
          roles: [{ id: 'calc-user-role-id', name: 'Calc User' }],
          permissions: ['calc:basic'],
        },
      };
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'self',
      requiredRoleId: 'calc-user-role-id',
      requiredPermId: 'calc:basic',
      handler: vi.fn().mockResolvedValue({ answer: 3 }),
    });

    const req = makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('UNAUTHORIZED');
  });
});

// ── Org RBAC ────────────────────────────────────────────────────────────────
describe('POST /api/protected - org RBAC', () => {
  it('returns 403 ORG_NOT_MEMBER when active org (asOrg) in custom data does not match requiredOrgId', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        custom_data: { Preferences: { asOrg: 'different-org-id' } },
      }),
    } as Response);

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'test-org-id',
      requiredRoleId: 'role-1',
      requiredPermId: 'perm:1',
      handler: vi.fn(),
    });

    const req = makeRequest({ action: 'org-action' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('ORG_NOT_MEMBER');
  });

  it('returns 403 ORG_NOT_MEMBER when active org matches, but verifyOrgAccess fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        custom_data: { Preferences: { asOrg: 'test-org-id' } },
      }),
    } as Response);

    const { verifyOrgAccess } = await import('../../logto-kit/logic/actions');
    (verifyOrgAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      error: 'ORG_NOT_MEMBER',
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'test-org-id',
      requiredRoleId: 'role-1',
      requiredPermId: 'perm:1',
      handler: vi.fn(),
    });

    const req = makeRequest({ action: 'org-action' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('ORG_NOT_MEMBER');
  });

  it('returns 403 ROLE_DENIED when user lacks the required org role', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        custom_data: { Preferences: { asOrg: 'test-org-id' } },
      }),
    } as Response);

    const { verifyOrgAccess } = await import('../../logto-kit/logic/actions');
    (verifyOrgAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      data: {
        roles: [{ id: 'other-role', name: 'Other Role' }],
        permissions: ['perm:1'],
      },
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'test-org-id',
      requiredRoleId: 'role-1',
      requiredPermId: 'perm:1',
      handler: vi.fn(),
    });

    const req = makeRequest({ action: 'org-action' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('ROLE_DENIED');
  });

  it('returns 403 PERMISSION_DENIED when user lacks the required org permission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        custom_data: { Preferences: { asOrg: 'test-org-id' } },
      }),
    } as Response);

    const { verifyOrgAccess } = await import('../../logto-kit/logic/actions');
    (verifyOrgAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      data: {
        roles: [{ id: 'role-1', name: 'Role 1' }],
        permissions: ['other:perm'],
      },
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'test-org-id',
      requiredRoleId: 'role-1',
      requiredPermId: 'perm:1',
      handler: vi.fn(),
    });

    const req = makeRequest({ action: 'org-action' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('PERMISSION_DENIED');
  });

  it('returns the answer when active org matches and org RBAC passes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        custom_data: { Preferences: { asOrg: 'test-org-id' } },
      }),
    } as Response);

    const { verifyOrgAccess } = await import('../../logto-kit/logic/actions');
    (verifyOrgAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      data: {
        roles: [{ id: 'role-1', name: 'Role 1' }],
        permissions: ['perm:1'],
      },
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'test-org-id',
      requiredRoleId: 'role-1',
      requiredPermId: 'perm:1',
      handler: vi.fn().mockResolvedValue({ answer: 42 }),
    });

    const req = makeRequest({ action: 'org-action' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ answer: 42 });
  });

  it('returns 401 UNAUTHORIZED when org verifier reports principal mismatch in compatibility mode', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        custom_data: { Preferences: { asOrg: 'test-org-id' } },
      }),
    } as Response);

    const { verifyOrgAccess } = await import('../../logto-kit/logic/actions');
    (verifyOrgAccess as ReturnType<typeof vi.fn>).mockImplementationOnce(async (_orgId: string, expectedPrincipal?: { sub?: string }) => {
      if (expectedPrincipal?.sub === 'mock-user-id') {
        return { ok: false, error: 'UNAUTHORIZED' };
      }

      return { ok: false, error: 'ORG_NOT_MEMBER' };
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'test-org-id',
      requiredRoleId: 'role-1',
      requiredPermId: 'perm:1',
      handler: vi.fn(),
    });

    const req = makeRequest({ action: 'org-action' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('UNAUTHORIZED');
  });
});

// ── Handler errors ──────────────────────────────────────────────────────────
describe('POST /api/protected - handler errors', () => {
  it('returns 400 INVALID_PAYLOAD when the handler throws INVALID_PAYLOAD', async () => {
    const { verifyPersonalAccess } = await import('../../logto-kit/logic/actions');
    (verifyPersonalAccess as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      data: {
        roles: [{ id: 'calc-user-role-id', name: 'Calc User' }],
        permissions: ['calc:basic'],
      },
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      requiredOrgId: 'self',
      requiredRoleId: 'calc-user-role-id',
      requiredPermId: 'calc:basic',
      handler: vi.fn().mockRejectedValue(new Error('INVALID_PAYLOAD: a must be a number')),
    });

    const req = makeRequest({ action: 'calc/add', payload: { a: 'bad', b: 2 } });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('INVALID_PAYLOAD');
  });
});

// ── BUG-001: Content-length check ─────────────────────────────────────────
describe('POST /api/protected - BUG-001 content-length check', () => {
  it('returns 413 PAYLOAD_TOO_LARGE when content-length exceeds 1MB', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
        'content-length': '2000000',
      },
      body: JSON.stringify({ action: 'test' }),
    });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(413);
    expect(body.error).toBe('PAYLOAD_TOO_LARGE');
  });

  it('allows request when content-length is under 1MB', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
        'content-length': '100',
      },
      body: JSON.stringify({ action: 'test' }),
    });
    const { POST } = await import('./route');
    const res = await POST(req);

    // Should not be 413 (may be other errors like missing token, but not payload too large)
    expect(res.status).not.toBe(413);
  });

  it('BUG-M-004: returns 413 PAYLOAD_TOO_LARGE when content-length is missing (chunked encoding)', async () => {
    const req = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
        // 'content-length' is intentionally omitted here
      },
      body: JSON.stringify({ action: 'test' }),
    });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(413);
    expect(body.error).toBe('PAYLOAD_TOO_LARGE');
  });
});

// ── BUG-008: Action name validation ───────────────────────────────────────
describe('POST /api/protected - BUG-008 action name validation', () => {
  it('returns 400 MISSING_FIELDS when action is empty string', async () => {
    const req = makeRequest({ action: '' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('MISSING_FIELDS');
  });

  it('returns 400 MISSING_FIELDS when action exceeds 128 characters', async () => {
    const req = makeRequest({ action: 'a'.repeat(129) });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('MISSING_FIELDS');
  });

  it('allows action names up to 128 characters', async () => {
    const req = makeRequest({ action: 'a'.repeat(128) });
    const { POST } = await import('./route');
    const res = await POST(req);

    // Should not be 400 for action length (may fail for other reasons)
    expect(res.status).not.toBe(400);
  });
});

// ── BUG-009: Token audience verification ─────────────────────────────────
describe('POST /api/protected - BUG-009 token audience verification', () => {
  it('returns 401 TOKEN_INVALID when client_id does not match appId', async () => {
    const { introspectToken } = await import('../../logto-kit/logic/utils');
    (introspectToken as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      active: true,
      sub: 'mock-user-id',
      client_id: 'wrong-client-id',
    });

    const req = makeRequest({ action: 'test' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('TOKEN_INVALID');
  });

  it('allows request when client_id matches appId', async () => {
    const { introspectToken } = await import('../../logto-kit/logic/utils');
    (introspectToken as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      active: true,
      sub: 'mock-user-id',
      client_id: 'test-app-id',
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const req = makeRequest({ action: 'test' });
    const { POST } = await import('./route');
    const res = await POST(req);

    // Should not be 401 for audience (may be 404 for missing action)
    expect(res.status).not.toBe(401);
  });

  it('returns 401 TOKEN_INVALID when client_id is absent from introspection (BUG-H02)', async () => {
    const { introspectToken } = await import('../../logto-kit/logic/utils');
    (introspectToken as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      active: true,
      sub: 'mock-user-id',
      // client_id intentionally absent — must fail closed
    });

    (getAction as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const req = makeRequest({ action: 'test' });
    const { POST } = await import('./route');
    const res = await POST(req);
    const body = await res.json();

    // Absent client_id must now be rejected (fail-closed)
    expect(res.status).toBe(401);
    expect(body.error).toBe('TOKEN_INVALID');
  });
});
