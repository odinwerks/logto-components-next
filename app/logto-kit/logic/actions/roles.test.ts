import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../config', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-m2m-token'),
}));

vi.mock('../utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://auth.example.org'),
  introspectToken: vi.fn().mockResolvedValue({ active: true, sub: 'user-test-123' }),
}));

vi.mock('../guards', () => ({
  assertSafeUserId: vi.fn(),
  assertSafeLogtoId: vi.fn(),
}));

vi.mock('../log', () => ({
  warn: vi.fn(),
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { getTokenForServerAction } from './tokens';
import { warn } from '../log';

const mockJsonResponse = <T>(data: T, status = 200): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(''),
  }) as unknown as Response;

const makeRole = (id: string, name: string) => ({
  id,
  name,
  description: `Role: ${name}`,
  type: 'User' as const,
});

describe('verifyPersonalAccess compatibility fallback', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ active: true, sub: 'user-test-123' });
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://auth.example.org');
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns UNAUTHORIZED when session retrieval fails, even if expectedPrincipal is supplied', async () => {
    vi.mocked(getTokenForServerAction).mockRejectedValueOnce(new Error('session-unavailable'));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess({ sub: 'user-compat-777' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
  });

  it('returns UNAUTHORIZED when expected principal is absent and session retrieval fails', async () => {
    vi.mocked(getTokenForServerAction).mockRejectedValueOnce(new Error('session-unavailable'));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
  });
});

describe('verifyPersonalAccess - existingIntrospection optimization', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ active: true, sub: 'user-test-123' });
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://auth.example.org');
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('skips introspectToken when existingIntrospection is provided', async () => {
    const existingIntrospection = { active: true, sub: 'user-test-123' };

    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 's1', name: 'read:data' }]));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess(undefined, existingIntrospection);

    expect(result.ok).toBe(true);
    expect(introspectToken).not.toHaveBeenCalled();
    expect(getTokenForServerAction).not.toHaveBeenCalled();
  });

  it('calls introspectToken when existingIntrospection is not provided', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 's1', name: 'read:data' }]));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess();

    expect(result.ok).toBe(true);
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token');
  });

  it('validates expectedPrincipal against existingIntrospection', async () => {
    const existingIntrospection = { active: true, sub: 'user-other-999' };

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess({ sub: 'user-test-123' }, existingIntrospection);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(introspectToken).not.toHaveBeenCalled();
  });

  it('rejects inactive existingIntrospection', async () => {
    const existingIntrospection = { active: false };

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess(undefined, existingIntrospection);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(introspectToken).not.toHaveBeenCalled();
  });

  it('fails closed when all parallel scope fetches fail', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce({
        status: 500,
        ok: false,
        text: async () => 'Internal Server Error',
      } as Response);

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('FETCH_FAILED');
  });
});

describe('getRoleDetails authorization and IDOR guard', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ active: true, sub: 'user-test-123' });
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://auth.example.org');
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('rejects unauthenticated requests with UNAUTHORIZED when no active session is found', async () => {
    vi.mocked(getTokenForServerAction).mockRejectedValueOnce(new Error('session-unavailable'));

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    // No Management API call should happen without a valid session
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('successfully fetches role details when the caller is assigned to the role', async () => {
    const mockRole = makeRole('role-123', 'Admin');
    // 1. User roles fetch — caller is assigned to the requested role
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse([makeRole('role-123', 'Admin'), makeRole('role-456', 'Viewer')])
    );
    // 2. Role details fetch
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockRole));

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data).toEqual(mockRole);

    // Authorization cross-check: user-scoped roles endpoint must be called first
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://auth.example.org/api/users/user-test-123/roles',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer mock-m2m-token' },
      })
    );
    // Role details endpoint called only after authorization passes
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://auth.example.org/api/roles/role-123',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer mock-m2m-token' },
      })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects with UNAUTHORIZED when the requested role is not assigned to the caller', async () => {
    // User roles fetch — does NOT include the requested role
    fetchSpy.mockResolvedValueOnce(mockJsonResponse([makeRole('role-456', 'Viewer')]));

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');

    // IDOR prevented: the role details endpoint must never be called
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://auth.example.org/api/users/user-test-123/roles',
      expect.anything()
    );
  });

  it('rejects with UNAUTHORIZED when the caller has no roles assigned', async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse([]));

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('fails closed with UNAUTHORIZED when the user roles fetch itself fails', async () => {
    fetchSpy.mockResolvedValueOnce({
      status: 500,
      ok: false,
      text: async () => 'Internal Server Error',
    } as Response);

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');

    // Must not proceed to fetch role details when authorization cannot be verified
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('getUserScopes error handling', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ active: true, sub: 'user-test-123' });
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://auth.example.org');
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('warns with raw details but throws a clean status-only error when scopes fetch fails', async () => {
    // 1. Roles fetch returns one role
    fetchSpy.mockResolvedValueOnce(mockJsonResponse([makeRole('role-123', 'Admin')]));
    // 2. Scopes fetch returns 500 with secret/raw details
    fetchSpy.mockResolvedValueOnce({
      status: 500,
      ok: false,
      text: async () => 'Super Secret Raw Backend Error Details',
    } as Response);

        const { getUserScopes } = await import('./roles');
    const result = await getUserScopes();

    // Since all parallel scope fetches failed, it throws an error and returns ok: false
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.error).toBe('FETCH_FAILED');

    // The raw details MUST be logged via warn
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Super Secret Raw Backend Error Details'));

    // But the rejected promise's error message (which was logged or used) must NOT embed the raw details
    // It should be a clean status-only message: "Management API returned 500"
    const warnCalls = vi.mocked(warn).mock.calls;
    const scopeFetchFailCall = warnCalls.find(call => typeof call[0] === 'string' && call[0].includes('[getUserScopes] Scope fetch failed for a role'));
    expect(scopeFetchFailCall).toBeDefined();
    expect(scopeFetchFailCall![0]).toContain('Management API returned 500');
    expect(scopeFetchFailCall![0]).not.toContain('Super Secret Raw Backend Error Details');
  });
});
