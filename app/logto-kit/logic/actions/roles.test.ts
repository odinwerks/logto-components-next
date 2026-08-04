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

describe('verifyPersonalAccess - fresh introspection (BUG-005 / BUG-061)', () => {
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

  it('ALWAYS performs fresh introspection (BUG-005: no existingIntrospection param)', async () => {
    // BUG-005: the existingIntrospection parameter has been removed. The
    // function must always derive the user identity from a live token
    // introspection it performs itself — never from a caller-supplied object.
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 's1', name: 'read:data' }]));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess();

    expect(result.ok).toBe(true);
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token', { assertAudience: true });
    expect(getTokenForServerAction).toHaveBeenCalled();
  });

  it('calls introspectToken when no expected principal is provided', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([{ id: 's1', name: 'read:data' }]));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess();

    expect(result.ok).toBe(true);
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token', { assertAudience: true });
  });

  it('validates expectedPrincipal against the freshly-introspected sub (BUG-005)', async () => {
    // The introspection mock returns sub 'user-test-123'. Supplying an
    // expectedPrincipal with a different sub must still be rejected, and
    // introspection MUST have run (not skipped).
    fetchSpy.mockRejectedValue(new Error('fetch should not be called'));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess({ sub: 'user-other-999' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token', { assertAudience: true });
  });

  it('rejects an inactive introspection (fresh, not caller-supplied)', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ active: false } as never);

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(introspectToken).toHaveBeenCalled();
  });

  it('fails closed with UNAUTHORIZED when introspectToken throws (BUG-061)', async () => {
    // BUG-061: an introspection failure (network, token expired, etc.) must
    // be caught and sanitized to UNAUTHORIZED, never bubble up raw.
    vi.mocked(introspectToken).mockRejectedValueOnce(new Error('introspection network failure'));
    fetchSpy.mockRejectedValue(new Error('fetch should not be called'));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(getManagementApiToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
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
      'https://auth.example.org/api/users/user-test-123/roles?page=1&page_size=20',
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

  it('authorizes role details when the requested role is assigned on page 2', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) =>
      makeRole(`role-page-1-${index}`, `Page 1 role ${index}`),
    );
    const requestedRole = makeRole('role-123', 'Page 2 Admin');
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse(firstPage))
      .mockResolvedValueOnce(mockJsonResponse([requestedRole]))
      .mockResolvedValueOnce(mockJsonResponse(requestedRole));

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result).toEqual({ ok: true, data: requestedRole });
    expect(fetchSpy.mock.calls.map((call: [string, RequestInit?]) => call[0])).toEqual([
      'https://auth.example.org/api/users/user-test-123/roles?page=1&page_size=20',
      'https://auth.example.org/api/users/user-test-123/roles?page=2&page_size=20',
      'https://auth.example.org/api/roles/role-123',
    ]);
  });

  it('fails closed when page 2 of the role-assignment check fails', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) =>
      makeRole(`role-page-1-${index}`, `Page 1 role ${index}`),
    );
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse(firstPage))
      .mockResolvedValueOnce({
        status: 503,
        ok: false,
        text: async () => 'sensitive upstream details',
      } as Response);

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).not.toHaveBeenCalledWith(
      'https://auth.example.org/api/roles/role-123',
      expect.anything(),
    );
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
      'https://auth.example.org/api/users/user-test-123/roles?page=1&page_size=20',
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
    const text = vi.fn().mockResolvedValue('Internal Server Error with alice@example.com');
    fetchSpy.mockResolvedValueOnce({
      status: 500,
      ok: false,
      text,
    } as unknown as Response);

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(text).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[getRoleDetails] User roles endpoint returned 500');

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

  it('logs only operation and status when a scopes response contains sensitive details', async () => {
    // 1. Roles fetch returns one role
    fetchSpy.mockResolvedValueOnce(mockJsonResponse([makeRole('role-123', 'Admin')]));
    // 2. Scopes fetch returns 500 with secret/raw details
    const text = vi.fn().mockResolvedValue('Super Secret Raw Backend Error Details');
    fetchSpy.mockResolvedValueOnce({
      status: 500,
      ok: false,
      text,
    } as unknown as Response);

    const { getUserScopes } = await import('./roles');
    const result = await getUserScopes();

    // Since all parallel scope fetches failed, it throws an error and returns ok: false
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.error).toBe('FETCH_FAILED');

    expect(text).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Super Secret Raw Backend Error Details'));

    // But the rejected promise's error message (which was logged or used) must NOT embed the raw details
    // It should be a clean status-only message: "Management API returned 500"
    const warnCalls = vi.mocked(warn).mock.calls;
    const scopeFetchFailCall = warnCalls.find(call => typeof call[0] === 'string' && call[0].includes('[getUserScopes] Scope fetch failed for a role'));
    expect(scopeFetchFailCall).toBeDefined();
    expect(scopeFetchFailCall![0]).toContain('Management API returned 500');
    expect(scopeFetchFailCall![0]).not.toContain('Super Secret Raw Backend Error Details');
  });
});
