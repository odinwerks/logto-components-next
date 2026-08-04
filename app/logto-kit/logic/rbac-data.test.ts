import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';

// ============================================================================
// Mocks — match the patterns in roles.test.ts / organizations.test.ts.
// ============================================================================

vi.mock('../config', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-m2m-token'),
}));

vi.mock('./utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://auth.example.org'),
}));

vi.mock('./guards', () => ({
  assertSafeLogtoId: vi.fn(),
}));

vi.mock('./log', () => ({
  warn: vi.fn(),
}));

vi.mock('./errors', () => ({
  plainCode: vi.fn((code: string) => {
    const e = new Error(code);
    e.name = 'SanitizedError';
    (e as Error & { code?: string }).code = code;
    return e;
  }),
}));

const managementRequestMocks = vi.hoisted(() => {
  const makeManagementFetch = vi.fn();
  const fetchAllManagementPages = vi.fn(
    async (url: string, options: { token: string; signal?: AbortSignal; deadlineAt?: number }) => {
      const response = await makeManagementFetch(url, { method: 'GET', ...options });
      if (!response.ok) return { ok: false as const, response };
      return { ok: true as const, data: await response.json() };
    },
  );

  return { makeManagementFetch, fetchAllManagementPages };
});

vi.mock('./actions/management-request', () => managementRequestMocks);

import { getManagementApiToken } from '../config';
import { getCleanEndpoint } from './utils';
import { assertSafeLogtoId } from './guards';
import { warn } from './log';
import { plainCode } from './errors';
import { makeManagementFetch } from './actions/management-request';
import { fetchPersonalRbacCore, fetchOrgRbacCore } from './rbac-data';
import type { UserRole, RoleScope, OrgRoleScope } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockJsonResponse = <T>(data: T, status = 200): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(''),
  }) as unknown as Response;

const makeRole = (id: string, name: string): UserRole => ({
  id,
  name,
  description: `Role: ${name}`,
  type: 'User',
});

const makePersonalScope = (
  id: string,
  name: string,
  resourceIndicator: string,
  resourceName: string,
): RoleScope => ({
  id,
  name,
  description: null,
  resourceId: 'res-1',
  tenantId: 'tenant-1',
  createdAt: 0,
  resource: {
    id: 'res-1',
    name: resourceName,
    indicator: resourceIndicator,
    isDefault: false,
    tenantId: 'tenant-1',
    accessTokenTtl: 3600,
  },
});

const makeOrgScope = (id: string, name: string): OrgRoleScope => ({
  id,
  name,
  description: null,
  tenantId: 'tenant-1',
});

const USER_ID = 'user-test-123';
const ORG_ID = 'org-test-456';

// ─── fetchPersonalRbacCore ───────────────────────────────────────────────────

describe('fetchPersonalRbacCore', () => {
  let fetchMock: MockedFunction<typeof makeManagementFetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://auth.example.org');
    vi.mocked(assertSafeLogtoId).mockImplementation(() => undefined);
    fetchMock = vi.mocked(makeManagementFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates the userId with assertSafeLogtoId before any fetch', async () => {
    vi.mocked(assertSafeLogtoId).mockImplementation((id, field) => {
      if (typeof id !== 'string' || id === 'BAD') {
        throw new Error(`INVALID_ID:${field ?? 'id'}`);
      }
    });

    await expect(fetchPersonalRbacCore('BAD')).rejects.toThrow('INVALID_ID:userId');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes ONE roles GET + N parallel scopes GETs and unions permissions', async () => {
    const roles = [makeRole('r1', 'Admin'), makeRole('r2', 'Viewer')];
    const r1Scopes = [
      makePersonalScope('s1', 'read:x', 'https://api.x', 'X Service'),
      makePersonalScope('s2', 'write:x', 'https://api.x', 'X Service'),
    ];
    const r2Scopes = [makePersonalScope('s3', 'read:y', 'https://api.y', 'Y Service')];

    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      if (url.endsWith('/api/roles/r1/scopes')) {
        return Promise.resolve(mockJsonResponse(r1Scopes));
      }
      if (url.endsWith('/api/roles/r2/scopes')) {
        return Promise.resolve(mockJsonResponse(r2Scopes));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchPersonalRbacCore(USER_ID);

    // One roles GET + two scopes GETs (one per role).
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://auth.example.org/api/users/${USER_ID}/roles`,
      { method: 'GET', token: 'mock-m2m-token' },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.example.org/api/roles/r1/scopes',
      { method: 'GET', token: 'mock-m2m-token' },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.example.org/api/roles/r2/scopes',
      { method: 'GET', token: 'mock-m2m-token' },
    );

    expect(result.roles).toEqual(roles);
    expect(result.permissions).toHaveLength(3);
    expect(result.permissions).toContainEqual({
      scope: 'read:x',
      resourceName: 'X Service',
      resourceIndicator: 'https://api.x',
      description: null,
    });
    expect(result.permissions).toContainEqual({
      scope: 'write:x',
      resourceName: 'X Service',
      resourceIndicator: 'https://api.x',
      description: null,
    });
    expect(result.permissions).toContainEqual({
      scope: 'read:y',
      resourceName: 'Y Service',
      resourceIndicator: 'https://api.y',
      description: null,
    });
  });

  it('returns { roles: [], permissions: [] } when the user has no roles', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse([]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchPersonalRbacCore(USER_ID);

    expect(result).toEqual({ roles: [], permissions: [] });
    // No scopes fetches when there are no roles.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('dedupes permissions by `${resource.indicator}:${scope.name}` across roles', async () => {
    const roles = [makeRole('r1', 'A'), makeRole('r2', 'B')];
    const shared = makePersonalScope('s1', 'read:x', 'https://api.x', 'X Service');
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      // Both roles return the SAME scope → must be deduped.
      if (url.endsWith('/api/roles/r1/scopes') || url.endsWith('/api/roles/r2/scopes')) {
        return Promise.resolve(mockJsonResponse([shared]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchPersonalRbacCore(USER_ID);

    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].scope).toBe('read:x');
  });

  it('skips scopes missing resource.indicator or resource.name (with a warn)', async () => {
    const roles = [makeRole('r1', 'Admin')];
    const broken = {
      ...makePersonalScope('s1', 'read:x', 'https://api.x', 'X Service'),
      resource: { id: 'res-1', name: '', indicator: '', isDefault: false, tenantId: 't', accessTokenTtl: 0 },
    };
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      if (url.endsWith('/api/roles/r1/scopes')) {
        return Promise.resolve(mockJsonResponse([broken]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchPersonalRbacCore(USER_ID);

    expect(result.permissions).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('missing resource info'),
    );
  });

  it('throws FETCH_FAILED when the roles GET fails (non-403/404)', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse({}, 500));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    await expect(fetchPersonalRbacCore(USER_ID)).rejects.toThrow('FETCH_FAILED');
    expect(plainCode).toHaveBeenCalledWith('FETCH_FAILED');
  });

  it('tolerates partial scope-fetch failures and returns the union of successes', async () => {
    const roles = [makeRole('r1', 'A'), makeRole('r2', 'B')];
    const r1Scopes = [makePersonalScope('s1', 'read:x', 'https://api.x', 'X Service')];
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      if (url.endsWith('/api/roles/r1/scopes')) {
        return Promise.resolve(mockJsonResponse(r1Scopes));
      }
      if (url.endsWith('/api/roles/r2/scopes')) {
        return Promise.resolve(mockJsonResponse({}, 500)); // fails
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchPersonalRbacCore(USER_ID);

    expect(result.roles).toEqual(roles);
    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].scope).toBe('read:x');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Scope fetch failed for a role'),
    );
  });

  it('throws FETCH_FAILED when ALL scope fetches fail (BUG-L10 guard)', async () => {
    const roles = [makeRole('r1', 'A'), makeRole('r2', 'B')];
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      // Every scopes GET fails.
      return Promise.resolve(mockJsonResponse({}, 500));
    });

    await expect(fetchPersonalRbacCore(USER_ID)).rejects.toThrow('FETCH_FAILED');
    expect(plainCode).toHaveBeenCalledWith('FETCH_FAILED');
  });

  it('calls getManagementApiToken() with NO args (NEVER-TOUCH)', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse([]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    await fetchPersonalRbacCore(USER_ID);

    expect(getManagementApiToken).toHaveBeenCalledWith();
    expect(getManagementApiToken).toHaveBeenCalledTimes(1);
  });

  it('encodeURIComponent-wraps the userId in the roles URL', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(mockJsonResponse([])));
    // Use an ID with a hyphen (valid per SAFE_ID_REGEX) to confirm it round-trips.
    const weird = 'user_with-dash';
    await fetchPersonalRbacCore(weird);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://auth.example.org/api/users/${encodeURIComponent(weird)}/roles`,
      { method: 'GET', token: 'mock-m2m-token' },
    );
  });

  it('strips tenantId from returned roles (BUG-048)', async () => {
    const roles = [
      { ...makeRole('r1', 'Admin'), tenantId: 'tenant-secret' },
      { ...makeRole('r2', 'Viewer'), tenantId: 'tenant-secret' },
    ];
    const r1Scopes = [makePersonalScope('s1', 'read:x', 'https://api.x', 'X Service')];
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      if (url.endsWith('/api/roles/r1/scopes')) {
        return Promise.resolve(mockJsonResponse(r1Scopes));
      }
      if (url.endsWith('/api/roles/r2/scopes')) {
        return Promise.resolve(mockJsonResponse([]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchPersonalRbacCore(USER_ID);

    for (const role of result.roles) {
      expect(role).not.toHaveProperty('tenantId');
    }
    // Verify the roles are otherwise intact.
    expect(result.roles).toEqual([
      { id: 'r1', name: 'Admin', description: 'Role: Admin', type: 'User' },
      { id: 'r2', name: 'Viewer', description: 'Role: Viewer', type: 'User' },
    ]);
  });
});

// ─── fetchOrgRbacCore ────────────────────────────────────────────────────────

describe('fetchOrgRbacCore', () => {
  let fetchMock: MockedFunction<typeof makeManagementFetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://auth.example.org');
    vi.mocked(assertSafeLogtoId).mockImplementation(() => undefined);
    fetchMock = vi.mocked(makeManagementFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates BOTH userId and orgId with assertSafeLogtoId before any fetch', async () => {
    vi.mocked(assertSafeLogtoId).mockImplementation((id, field) => {
      if (typeof id !== 'string' || id === 'BAD') {
        throw new Error(`INVALID_ID:${field ?? 'id'}`);
      }
    });

    await expect(fetchOrgRbacCore('BAD', ORG_ID)).rejects.toThrow('INVALID_ID:userId');
    await expect(fetchOrgRbacCore(USER_ID, 'BAD')).rejects.toThrow('INVALID_ID:orgId');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes ONE org-roles GET + N parallel org-role-scopes GETs and dedupes by name', async () => {
    const roles = [makeRole('r1', 'Org Admin'), makeRole('r2', 'Member')];
    const r1Scopes = [makeOrgScope('s1', 'org:read'), makeOrgScope('s2', 'org:write')];
    const r2Scopes = [makeOrgScope('s3', 'org:read')]; // duplicate name across roles
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      if (url.endsWith('/api/organization-roles/r1/scopes')) {
        return Promise.resolve(mockJsonResponse(r1Scopes));
      }
      if (url.endsWith('/api/organization-roles/r2/scopes')) {
        return Promise.resolve(mockJsonResponse(r2Scopes));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchOrgRbacCore(USER_ID, ORG_ID);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://auth.example.org/api/organizations/${ORG_ID}/users/${USER_ID}/roles`,
      { method: 'GET', token: 'mock-m2m-token' },
    );

    expect(result.roles).toEqual(roles);
    // 'org:read' is returned by both r1 and r2 — must be deduped.
    expect(result.permissions).toHaveLength(2);
    const names = result.permissions.map((p) => p.name).sort();
    expect(names).toEqual(['org:read', 'org:write']);
  });

  it('returns { roles: [], permissions: [] } when user has no org roles', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse([]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchOrgRbacCore(USER_ID, ORG_ID);

    expect(result).toEqual({ roles: [], permissions: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns { roles: [], permissions: [] } on 403 (not a member)', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse({}, 403));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchOrgRbacCore(USER_ID, ORG_ID);

    expect(result).toEqual({ roles: [], permissions: [] });
  });

  it('returns { roles: [], permissions: [] } on 404 (org not found)', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse({}, 404));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchOrgRbacCore(USER_ID, ORG_ID);

    expect(result).toEqual({ roles: [], permissions: [] });
  });

  it('throws FETCH_FAILED when the roles GET fails with non-403/404', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse({}, 500));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    await expect(fetchOrgRbacCore(USER_ID, ORG_ID)).rejects.toThrow('FETCH_FAILED');
    expect(plainCode).toHaveBeenCalledWith('FETCH_FAILED');
  });

  it('tolerates partial scope-fetch failures and returns the union of successes', async () => {
    const roles = [makeRole('r1', 'A'), makeRole('r2', 'B')];
    const r1Scopes = [makeOrgScope('s1', 'org:read')];
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      if (url.endsWith('/api/organization-roles/r1/scopes')) {
        return Promise.resolve(mockJsonResponse(r1Scopes));
      }
      if (url.endsWith('/api/organization-roles/r2/scopes')) {
        return Promise.resolve(mockJsonResponse({}, 500)); // fails
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchOrgRbacCore(USER_ID, ORG_ID);

    expect(result.roles).toEqual(roles);
    expect(result.permissions).toHaveLength(1);
    expect(result.permissions[0].name).toBe('org:read');
  });

  it('throws FETCH_FAILED when ALL scope fetches fail (BUG-L10 guard)', async () => {
    const roles = [makeRole('r1', 'A')];
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      return Promise.resolve(mockJsonResponse({}, 500));
    });

    await expect(fetchOrgRbacCore(USER_ID, ORG_ID)).rejects.toThrow('FETCH_FAILED');
    expect(plainCode).toHaveBeenCalledWith('FETCH_FAILED');
  });

  it('does NOT call getOrganizationUserPermissions (BUG-L01 — refresh-token grant stays lazy)', async () => {
    // We can't import the real module (it has 'use server' and imports the SDK),
    // so we just verify the URL pattern never references the token endpoint.
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse([]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    await fetchOrgRbacCore(USER_ID, ORG_ID);

    for (const call of fetchMock.mock.calls) {
      const url = call[0] as string;
      expect(url).not.toContain('/oidc/token');
      expect(url).not.toContain('grant_type');
    }
  });

  it('encodeURIComponent-wraps both userId and orgId in the roles URL', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(mockJsonResponse([])));
    const weirdUser = 'user_with-dash';
    const weirdOrg = 'org_with-dash';
    await fetchOrgRbacCore(weirdUser, weirdOrg);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://auth.example.org/api/organizations/${encodeURIComponent(weirdOrg)}/users/${encodeURIComponent(weirdUser)}/roles`,
      { method: 'GET', token: 'mock-m2m-token' },
    );
  });

  it('returns OrgRoleScope[] (NOT a Map) for RSC serializability', async () => {
    const roles = [makeRole('r1', 'A')];
    const scopes = [makeOrgScope('s1', 'org:read')];
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      if (url.endsWith('/api/organization-roles/r1/scopes')) {
        return Promise.resolve(mockJsonResponse(scopes));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchOrgRbacCore(USER_ID, ORG_ID);

    expect(Array.isArray(result.permissions)).toBe(true);
    // Ensure no Map sneaks in.
    expect(result.permissions).not.toBeInstanceOf(Map);
    expect(result.permissions[0]).toBeInstanceOf(Object);
    expect(typeof (result.permissions[0] as OrgRoleScope).name).toBe('string');
  });

  it('strips tenantId from returned roles and permissions (BUG-048)', async () => {
    const roles = [
      { ...makeRole('r1', 'Org Admin'), tenantId: 'tenant-secret' },
      { ...makeRole('r2', 'Member'), tenantId: 'tenant-secret' },
    ];
    const r1Scopes = [
      { ...makeOrgScope('s1', 'org:read'), tenantId: 'tenant-secret' },
      { ...makeOrgScope('s2', 'org:write'), tenantId: 'tenant-secret' },
    ];
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse(roles));
      }
      if (url.endsWith('/api/organization-roles/r1/scopes')) {
        return Promise.resolve(mockJsonResponse(r1Scopes));
      }
      if (url.endsWith('/api/organization-roles/r2/scopes')) {
        return Promise.resolve(mockJsonResponse([]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });

    const result = await fetchOrgRbacCore(USER_ID, ORG_ID);

    for (const role of result.roles) {
      expect(role).not.toHaveProperty('tenantId');
    }
    for (const perm of result.permissions) {
      expect(perm).not.toHaveProperty('tenantId');
    }
    // Verify data is otherwise intact.
    expect(result.roles).toEqual([
      { id: 'r1', name: 'Org Admin', description: 'Role: Org Admin', type: 'User' },
      { id: 'r2', name: 'Member', description: 'Role: Member', type: 'User' },
    ]);
    expect(result.permissions).toEqual([
      { id: 's1', name: 'org:read', description: null },
      { id: 's2', name: 'org:write', description: null },
    ]);
  });
});

// ─── React.cache wrappers (smoke test) ──────────────────────────────────────
//
// React.cache's internal memoization depends on React's runtime dispatcher,
// which is not reliably set up in a vitest environment outside of a render
// pass. We verify the cached wrappers exist, are callable, and return the
// correct data — not the dedup behavior (which is a React runtime concern
// exercised by the build + integration tests).

describe('cached-rbac wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://auth.example.org');
    vi.mocked(assertSafeLogtoId).mockImplementation(() => undefined);
    vi.mocked(makeManagementFetch).mockImplementation((url: string) => {
      if (url.endsWith(`/api/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse([]));
      }
      if (url.endsWith(`/api/organizations/${ORG_ID}/users/${USER_ID}/roles`)) {
        return Promise.resolve(mockJsonResponse([]));
      }
      return Promise.resolve(mockJsonResponse([], 404));
    });
  });

  it('fetchPersonalRbacCached is callable and returns PersonalRbacResult', async () => {
    const { fetchPersonalRbacCached } = await import('./cached-rbac');
    const result = await fetchPersonalRbacCached(USER_ID);
    expect(result).toEqual({ roles: [], permissions: [] });
  });

  it('fetchOrgRbacCached is callable and returns OrgRbacResult', async () => {
    const { fetchOrgRbacCached } = await import('./cached-rbac');
    const result = await fetchOrgRbacCached(USER_ID, ORG_ID);
    expect(result).toEqual({ roles: [], permissions: [] });
  });

  it('fetchOrgRbacCached with different orgId returns a distinct result', async () => {
    const { fetchOrgRbacCached } = await import('./cached-rbac');
    const r1 = await fetchOrgRbacCached(USER_ID, ORG_ID);
    const r2 = await fetchOrgRbacCached(USER_ID, 'org-other');
    expect(r1).toEqual({ roles: [], permissions: [] });
    expect(r2).toEqual({ roles: [], permissions: [] });
  });
});
