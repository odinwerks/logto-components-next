import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-m2m-token'),
  getLogtoConfig: vi.fn().mockReturnValue({ endpoint: 'https://auth.example.org' }),
}));

import { getManagementApiToken, getLogtoConfig } from '../../config';
import { fetchOrgRolePermissions } from './rbac-core';

const mockJsonResponse = <T>(data: T, status = 200): Response => ({
  status,
  ok: status >= 200 && status < 300,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(''),
}) as unknown as Response;

const makeRole = (id: string, name = id) => ({
  id,
  name,
  description: `Role: ${name}`,
  type: 'User' as const,
});

const makeScope = (id: string, name: string) => ({
  id,
  name,
  description: null,
  tenantId: 'mock-tenant-id',
});

describe('fetchOrgRolePermissions', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getLogtoConfig).mockReturnValue({ endpoint: 'https://auth.example.org' } as never);
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns the union and preserves permissions by role', async () => {
    const roleA = makeRole('r1', 'Admin');
    const roleB = makeRole('r2', 'Editor');
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([roleA, roleB]))
      .mockResolvedValueOnce(mockJsonResponse([
        makeScope('s1', 'read:orders'),
        makeScope('s2', 'read:orders'),
        makeScope('s3', 'view:audit'),
      ]))
      .mockResolvedValueOnce(mockJsonResponse([
        makeScope('s4', 'read:orders'),
        makeScope('s5', 'write:orders'),
      ]));

    const result = await fetchOrgRolePermissions('org-123', 'user-1');

    expect(result).toEqual({
      roles: [roleA, roleB],
      permissions: ['read:orders', 'view:audit', 'write:orders'],
      rolePermissions: {
        r1: ['read:orders', 'view:audit'],
        r2: ['read:orders', 'write:orders'],
      },
    });
  });

  it('returns an empty RBAC result for a member without roles', async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse([]));

    expect(await fetchOrgRolePermissions('org-123', 'user-1')).toEqual({
      roles: [],
      permissions: [],
      rolePermissions: {},
    });
  });

  it('tolerates a single failed scope request and preserves successful role permissions', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1'), makeRole('r2')]))
      .mockResolvedValueOnce(mockJsonResponse([makeScope('s1', 'read:orders')]))
      .mockResolvedValueOnce({ status: 500, ok: false, text: async () => 'failed' } as Response);

    const result = await fetchOrgRolePermissions('org-123', 'user-1');

    expect(result.permissions).toEqual(['read:orders']);
    expect(result.rolePermissions).toEqual({ r1: ['read:orders'] });
  });

  it('fails closed when all role-scope requests fail', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1')]))
      .mockResolvedValueOnce({ status: 503, ok: false, text: async () => 'unavailable' } as Response);

    await expect(fetchOrgRolePermissions('org-123', 'user-1')).rejects.toThrow('FETCH_FAILED');
  });

  it('maps confirmed membership failures to ORG_NOT_MEMBER', async () => {
    for (const response of [
      { status: 403, ok: false, text: async () => 'forbidden' },
      { status: 404, ok: false, text: async () => 'not found' },
      { status: 422, ok: false, text: async () => '{"code":"organization.user_not_exists"}' },
    ] as unknown as Response[]) {
      fetchSpy.mockReset();
      fetchSpy.mockResolvedValueOnce(response);
      await expect(fetchOrgRolePermissions('org-123', 'user-1')).rejects.toThrow('ORG_NOT_MEMBER');
    }
  });

  it('does not classify an unrelated 422 response as non-membership', async () => {
    fetchSpy.mockResolvedValueOnce({
      status: 422,
      ok: false,
      text: async () => '{"code":"validation_error"}',
    } as Response);

    await expect(fetchOrgRolePermissions('org-123', 'user-1')).rejects.toThrow(
      'Management API error: HTTP 422',
    );
  });

  it('uses paginated Management API requests for the role collection', async () => {
    const roles = Array.from({ length: 21 }, (_, index) => makeRole(`r${index}`));
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/users/user-1/roles')) {
        const page = Number(url.searchParams.get('page'));
        return mockJsonResponse(page === 1 ? roles.slice(0, 20) : roles.slice(20));
      }
      return mockJsonResponse([]);
    });

    const result = await fetchOrgRolePermissions('org-123', 'user-1');

    expect(result.roles).toHaveLength(21);
    expect(fetchSpy).toHaveBeenCalledTimes(23);
    expect(new URL(String(fetchSpy.mock.calls[0]?.[0])).searchParams.get('page')).toBe('1');
    expect(new URL(String(fetchSpy.mock.calls[1]?.[0])).searchParams.get('page')).toBe('2');
  });

  it('validates identifiers before token retrieval or network access', async () => {
    await expect(fetchOrgRolePermissions('bad org!', 'user-1')).rejects.toMatchObject({
      name: 'ValidationError',
    });
    await expect(fetchOrgRolePermissions('org-123', 'bad user!')).rejects.toMatchObject({
      name: 'ValidationError',
    });

    expect(getManagementApiToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
