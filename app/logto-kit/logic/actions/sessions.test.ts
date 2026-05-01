import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LogtoSession } from '../types';

// ============================================================================
// Module Mocks — hoisted above all imports
// ============================================================================

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
}));

vi.mock('../debug', () => ({
  debugLog: vi.fn(),
}));

vi.mock('../guards', () => ({
  assertSafeLogtoId: vi.fn(),
  assertRevokeGrantsTarget: vi.fn(),
}));

// ============================================================================
// Imports of mocked modules (for vi.mocked usage)
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Build a minimal LogtoSession-shaped object for testing.
 * Pass `isCurrent: true` or `isCurrent: false` to simulate the Logto API
 * returning the field, or omit it entirely (undefined) to simulate pre-ship Logto.
 */
const mockSession = (uid: string, isCurrent?: boolean): LogtoSession => ({
  payload: {
    exp: 9999999999,
    iat: 1700000000,
    jti: `jti-${uid}`,
    uid,
    kind: 'Session' as const,
    loginTs: 1700000000,
    accountId: 'acct_1',
  },
  lastSubmission: {
    interactionEvent: 'SignIn' as const,
    userId: 'user_1',
    verificationRecords: [],
    signInContext: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ip: '1.2.3.4' },
  },
  clientId: 'app_1',
  accountId: 'acct_1',
  expiresAt: 9999999999,
  meta: null,
  ...(isCurrent !== undefined ? { isCurrent } : {}),
});

/** Build a mock Response that resolves .json() to the given data. */
const mockJsonResponse = (data: unknown, status = 200): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data),
  }) as unknown as Response;

// ============================================================================
// getSessionsWithDeviceMeta — isCurrent propagation
// ============================================================================

describe('getSessionsWithDeviceMeta', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('sets meta.isCurrent = true when the API returns isCurrent: true', async () => {
    const session = mockSession('session-a', true);
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [session] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result).toHaveLength(1);
    expect(result[0].meta?.isCurrent).toBe(true);
  });

  it('sets meta.isCurrent = false when the API omits the isCurrent field (pre-ship Logto)', async () => {
    // No `isCurrent` property at all — simulates old Logto API
    const session = mockSession('session-b', undefined);
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [session] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result).toHaveLength(1);
    expect(result[0].meta?.isCurrent).toBe(false);
  });

  it('sets meta.isCurrent = false when the API explicitly returns isCurrent: false', async () => {
    const session = mockSession('session-c', false);
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [session] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result).toHaveLength(1);
    expect(result[0].meta?.isCurrent).toBe(false);
  });
});

// ============================================================================
// revokeAllOtherSessions — safety guard + selective revocation
// ============================================================================

describe('revokeAllOtherSessions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('throws "Cannot identify current session" when no session has isCurrent === true', async () => {
    // All sessions missing `isCurrent` — pre-ship Logto, or all are false
    const sessions = [
      mockSession('session-1', undefined),
      mockSession('session-2', undefined),
      mockSession('session-3', false),
    ];
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions })
    );

    const { revokeAllOtherSessions } = await import('./sessions');
    await expect(revokeAllOtherSessions('verification-record-id')).rejects.toThrow(
      'Cannot identify current session'
    );
  });

  it('only calls DELETE for non-current sessions, skipping the current one', async () => {
    const currentSession = mockSession('current-uid', true);
    const otherSession1 = mockSession('other-uid-1', false);
    const otherSession2 = mockSession('other-uid-2', undefined);

    const deletedPaths: string[] = [];

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      if (!opts?.method || opts.method === 'GET') {
        // GET /api/my-account/sessions
        return mockJsonResponse({ sessions: [currentSession, otherSession1, otherSession2] });
      }
      if (opts.method === 'DELETE') {
        deletedPaths.push(path);
        return mockJsonResponse({}, 204);
      }
      return mockJsonResponse({}, 200);
    });

    const { revokeAllOtherSessions } = await import('./sessions');
    await revokeAllOtherSessions('verification-record-id');

    // Should have deleted the two non-current sessions
    expect(deletedPaths).toHaveLength(2);
    // Current session must NOT be deleted
    expect(deletedPaths.every(p => !p.includes('current-uid'))).toBe(true);
    // Non-current sessions should be deleted
    expect(deletedPaths.some(p => p.includes('other-uid-1'))).toBe(true);
    expect(deletedPaths.some(p => p.includes('other-uid-2'))).toBe(true);
  });

  it('resolves without error when there is exactly one session and it is the current one', async () => {
    const currentSession = mockSession('only-session', true);

    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [currentSession] })
    );

    const { revokeAllOtherSessions } = await import('./sessions');
    // Should complete successfully — nothing to revoke
    await expect(revokeAllOtherSessions('verification-record-id')).resolves.toBeUndefined();
  });

  it('throws when sessions list is empty', async () => {
    vi.mocked(makeRequest).mockResolvedValue({
      ok: true,
      json: async () => ({ sessions: [] }),
    } as unknown as Response);

    const { revokeAllOtherSessions } = await import('./sessions');
    await expect(revokeAllOtherSessions('verif_1')).rejects.toThrow('Cannot identify current session');
  });
});
