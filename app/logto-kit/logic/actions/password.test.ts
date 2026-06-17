import { describe, it, expect, vi, beforeEach } from 'vitest';

// Module Mocks
vi.mock('../utils', () => ({
  introspectToken: vi.fn().mockResolvedValue({ sub: 'user-test-123', active: true }),
  getCleanEndpoint: vi.fn().mockReturnValue('https://auth.example.org'),
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

vi.mock('./request', () => ({
  makeRequest: vi.fn(),
}));

vi.mock('../errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
  plainCode: vi.fn((code: string) => {
    const err = new Error(code);
    err.name = 'SanitizedError';
    return err;
  }),
}));

vi.mock('../audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../guards')>();
  return {
    ...actual,
    assertSafeLogtoId: actual.assertSafeLogtoId,
  };
});

import { introspectToken } from '../utils';
import { makeRequest } from './request';
import { updateUserPassword } from './password';

describe('updateUserPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates password successfully when token is active', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: 'user-123', active: true });
    vi.mocked(makeRequest).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const res = await updateUserPassword('new-secure-password', 'vrec-123', Date.now());
    expect(res.ok).toBe(true);
  });

  it('fails with UNAUTHENTICATED when token is inactive', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: 'user-123', active: false });

    const res = await updateUserPassword('new-secure-password', 'vrec-123', Date.now());
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('Expected failure');
    expect(res.error).toBe('UNAUTHENTICATED');
  });
});
