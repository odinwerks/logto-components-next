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

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { getTokenForServerAction } from './tokens';

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
});

describe('getRoleDetails session authentication', () => {
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
  });

  it('successfully fetches role details when session is valid', async () => {
    const mockRole = makeRole('role-123', 'Admin');
    fetchSpy.mockResolvedValueOnce(mockJsonResponse(mockRole));

    const { getRoleDetails } = await import('./roles');
    const result = await getRoleDetails('role-123');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data).toEqual(mockRole);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://auth.example.org/api/roles/role-123',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer mock-m2m-token' },
      })
    );
  });
});
