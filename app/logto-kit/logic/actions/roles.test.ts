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

const makeScope = (id: string, name: string) => ({
  id,
  name,
  description: null,
  resource: {
    id: 'resource-id',
    name: 'Resource',
    indicator: 'https://resource.example.org',
  },
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

  it('falls back to expected principal when session retrieval fails', async () => {
    vi.mocked(getTokenForServerAction).mockRejectedValueOnce(new Error('session-unavailable'));

    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([makeScope('s1', 'read:orders')]));

    const { verifyPersonalAccess } = await import('./roles');
    const result = await verifyPersonalAccess({ sub: 'user-compat-777' });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://auth.example.org/api/users/user-compat-777/roles',
      expect.objectContaining({ method: 'GET' })
    );
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
