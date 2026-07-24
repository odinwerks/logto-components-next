import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LogtoSession } from '../types';

// ============================================================================
// Module Mocks - hoisted above all imports
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

vi.mock('../errors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../errors')>();
  return {
    ...actual,
    throwOnApiError: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../debug', () => ({
  debugLog: vi.fn(),
}));

vi.mock('../log', () => ({
  warn: vi.fn(),
  log: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logEvent: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
    raw: {},
  },
}));

vi.mock('./helpers', () => ({
  auditSafe: vi.fn(),
  assertVerificationNotExpired: vi.fn(),
  createLockManager: vi.fn(),
}));

vi.mock('../guards', () => ({
  assertSafeLogtoId: vi.fn(),
  assertRevokeGrantsTarget: vi.fn(),
}));

vi.mock('./verification-cookie', () => ({
  requireVerifiedIdentity: vi.fn().mockResolvedValue(undefined),
  sealVerificationCookie: vi.fn().mockResolvedValue(undefined),
  clearVerificationCookie: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Imports of mocked modules (for vi.mocked usage)
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import { warn } from '../log';
import { requireVerifiedIdentity } from './verification-cookie';
import { auditSafe } from './helpers';

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
// getSessionsWithDeviceMeta - isCurrent propagation
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

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].meta?.isCurrent).toBe(true);
  });

  it('sets meta.isCurrent = false when the API omits the isCurrent field (pre-ship Logto)', async () => {
    // No `isCurrent` property at all - simulates old Logto API
    const session = mockSession('session-b', undefined);
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [session] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].meta?.isCurrent).toBe(false);
  });

  it('sets meta.isCurrent = false when the API explicitly returns isCurrent: false', async () => {
    const session = mockSession('session-c', false);
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [session] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].meta?.isCurrent).toBe(false);
  });

  it('sets meta.userId to empty string without calling introspection for userId population (perf fix)', async () => {
    // Introspection was previously called to populate meta.userId, adding a
    // sequential 10 s network round-trip on every Sessions tab load. It is now
    // removed because meta.userId is not rendered in any UI component.
    // Note: introspection IS called for the auth guard, but NOT to populate userId.
    const session = mockSession('session-d', true);
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [session] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    // Should succeed
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    // userId is always empty string — introspection is used only for auth guard, not userId
    expect(result.data[0].meta?.userId).toBe('');
    // warn must NOT be called (no introspection error to log)
    expect(warn).not.toHaveBeenCalled();
  });

  it('preserves error codes and does not swallow them as INTERNAL_ERROR (BUG-014)', async () => {
    const processEnv = process.env as Record<string, string | undefined>;
    const origEnv = processEnv.NODE_ENV;
    processEnv.NODE_ENV = 'production';
    try {
      // Force throwOnApiError to throw a SanitizedError with 'FETCH_FAILED'
      const { throwOnApiError } = await import('../errors');
      vi.mocked(throwOnApiError).mockImplementationOnce(() => {
        const err = new Error('FETCH_FAILED');
        err.name = 'SanitizedError';
        throw err;
      });

      vi.mocked(makeRequest).mockResolvedValue(mockJsonResponse({}, 500));

      const { getSessionsWithDeviceMeta } = await import('./sessions');
      const result = await getSessionsWithDeviceMeta('verification-record-id');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('FETCH_FAILED');
    } finally {
      processEnv.NODE_ENV = origEnv;
    }
  });
});

describe('getUserSessions response shape assertions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('handles standard data.sessions structure', async () => {
    const session = mockSession('session-1');
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [session] })
    );

    const { getUserSessions } = await import('./sessions');
    const result = await getUserSessions('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].payload.uid).toBe('session-1');
    expect(warn).not.toHaveBeenCalled();
  });

  it('handles direct array data structure', async () => {
    const session = mockSession('session-1');
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse([session])
    );

    const { getUserSessions } = await import('./sessions');
    const result = await getUserSessions('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].payload.uid).toBe('session-1');
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns and returns empty list on unexpected response structure', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ unexpectedField: 'some-value' })
    );

    const { getUserSessions } = await import('./sessions');
    const result = await getUserSessions('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });
});

// ============================================================================
// revokeAllOtherSessions - safety guard + selective revocation
// ============================================================================

describe('revokeAllOtherSessions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('returns error when no session has isCurrent === true', async () => {
    // All sessions missing `isCurrent` - pre-ship Logto, or all are false
    const sessions = [
      mockSession('session-1', undefined),
      mockSession('session-2', undefined),
      mockSession('session-3', false),
    ];
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions })
    );

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verification-record-id');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error result');
    expect(result.error).toContain('SESSION_REVOKE_FAILED');
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
    const result = await revokeAllOtherSessions('verification-record-id');

    expect(result.ok).toBe(true);

    // Should have deleted the two non-current sessions
    expect(deletedPaths).toHaveLength(2);
    // Current session must NOT be deleted
    expect(deletedPaths.every(p => !p.includes('current-uid'))).toBe(true);
    // Non-current sessions should be deleted
    expect(deletedPaths.some(p => p.includes('other-uid-1'))).toBe(true);
    expect(deletedPaths.some(p => p.includes('other-uid-2'))).toBe(true);
  });

  it('uses payload.uid (OIDC session UID) not payload.jti (JWT ID) in revokeUserSession API path', async () => {
    // Sessions with deliberately different UID and JTI values to catch bugs
    // where s.payload.jti (JWT ID) is passed instead of s.payload.uid (OIDC session UID).
    const sessions = [
      mockSession('current-session', true),
      mockSession('other-session', false),
    ];
    // Override JTI and UID to be distinct so we can tell them apart
    sessions[0].payload.jti = 'jti-current-abc';
    sessions[0].payload.uid = 'uid-current-xyz';
    sessions[1].payload.jti = 'jti-other-def';
    sessions[1].payload.uid = 'uid-other-123';

    // Mock introspection to return sid matching the current session's uid
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true, sid: 'uid-current-xyz' });

    const deletedPaths: string[] = [];

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      if (!opts?.method || opts.method === 'GET') {
        return mockJsonResponse({ sessions });
      }
      if (opts.method === 'DELETE') {
        deletedPaths.push(path);
        return mockJsonResponse({}, 204);
      }
      return mockJsonResponse({}, 200);
    });

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verification-record-id');

    expect(result.ok).toBe(true);

    // Should have called DELETE for the non-current session
    expect(deletedPaths).toHaveLength(1);

    // The path should contain UID (uid-other-123), NOT JTI (jti-other-def)
    const path = deletedPaths[0];
    expect(path).toContain('uid-other-123');
    expect(path).not.toContain('jti-other-def');
  });

  it('resolves with ok when there is exactly one session and it is the current one', async () => {
    const currentSession = mockSession('only-session', true);

    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [currentSession] })
    );

    const { revokeAllOtherSessions } = await import('./sessions');
    // Should complete successfully - nothing to revoke
    const result = await revokeAllOtherSessions('verification-record-id');
    expect(result).toEqual({ ok: true });
  });

  it('returns error when sessions list is empty', async () => {
    vi.mocked(makeRequest).mockResolvedValue({
      ok: true,
      json: async () => ({ sessions: [] }),
    } as unknown as Response);

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verif_1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error result');
    expect(result.error).toContain('SESSION_REVOKE_FAILED');
  });

  // BUG-019: Session revocation timeout should abort the HTTP request
  it('passes an AbortSignal to makeRequest for each session revocation', async () => {
    const currentSession = mockSession('current-uid', true);
    const otherSession = mockSession('other-uid', false);

    const capturedSignals: AbortSignal[] = [];

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      if (!opts?.method || opts.method === 'GET') {
        return mockJsonResponse({ sessions: [currentSession, otherSession] });
      }
      if (opts.method === 'DELETE') {
        // Capture the signal for assertion
        if (opts.signal) capturedSignals.push(opts.signal);
        return mockJsonResponse({}, 204);
      }
      return mockJsonResponse({}, 200);
    });

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verification-record-id');

    expect(result.ok).toBe(true);
    // The DELETE call should have received an AbortSignal
    expect(capturedSignals).toHaveLength(1);
    expect(capturedSignals[0]).toBeInstanceOf(AbortSignal);
  });

  it('does not check verification expiration mid-loop during revokeAllOtherSessions (BUG-004)', async () => {
    const currentSession = mockSession('current-uid', true);
    const otherSession1 = mockSession('other-uid-1', false);
    const otherSession2 = mockSession('other-uid-2', false);

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      if (!opts?.method || opts.method === 'GET') {
        return mockJsonResponse({ sessions: [currentSession, otherSession1, otherSession2] });
      }
      return mockJsonResponse({}, 204);
    });

    // Mock Date.now to return an initial time for the first few calls (during initial checks and fetch),
    // and then advance it past the 15s tolerance for all subsequent calls, simulating time passing/delay mid-loop.
    const startTime = 1700000000000;
    let callCount = 0;
    const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
      callCount++;
      if (callCount <= 5) {
        return startTime;
      }
      return startTime + 20000; // 20 seconds later (past 15s skew tolerance)
    });

    try {
      const { revokeAllOtherSessions } = await import('./sessions');
      // Verification staleness is now checked by requireVerifiedIdentity (called once upfront),
      // so mid-loop Date.now() drift is irrelevant. We just verify the bulk revocation succeeds.
      const result = await revokeAllOtherSessions('verification-record-id');
      expect(result.ok).toBe(true);
    } finally {
      dateSpy.mockRestore();
    }
  });

  // BUG-016: each successful revocation inside the bulk loop must produce a
  // per-session audit record, so a partial failure never leaves revoked
  // sessions with zero audit trails. The partial-failure throw must also be a
  // sanitized code, not a raw Error leaking count/total detail.
  it('audits each successful revocation inside the loop on full success (BUG-016)', async () => {
    const currentSession = mockSession('current-uid', true);
    const otherSession1 = mockSession('other-uid-1', false);
    const otherSession2 = mockSession('other-uid-2', false);

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      if (!opts?.method || opts.method === 'GET') {
        return mockJsonResponse({ sessions: [currentSession, otherSession1, otherSession2] });
      }
      return mockJsonResponse({}, 204);
    });

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verification-record-id');

    expect(result.ok).toBe(true);
    // Each non-current session revocation is audited individually.
    expect(auditSafe).toHaveBeenCalledWith(
      'user-test-123',
      'session.revoke',
      'other-uid-1',
      { revokeGrantsTarget: 'firstParty' },
    );
    expect(auditSafe).toHaveBeenCalledWith(
      'user-test-123',
      'session.revoke',
      'other-uid-2',
      { revokeGrantsTarget: 'firstParty' },
    );
    // The bulk audit record is also written on full success.
    expect(auditSafe).toHaveBeenCalledWith(
      'user-test-123',
      'session.revoke.all',
      undefined,
      { count: 2 },
    );
  });

  it('writes per-session audit records for successful revocations and throws SESSION_REVOKE_PARTIAL on partial failure (BUG-016)', async () => {
    const currentSession = mockSession('current-uid', true);
    const otherSession1 = mockSession('other-uid-1', false); // will fail
    const otherSession2 = mockSession('other-uid-2', false); // will succeed

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      if (!opts?.method || opts.method === 'GET') {
        return mockJsonResponse({ sessions: [currentSession, otherSession1, otherSession2] });
      }
      if (opts.method === 'DELETE') {
        // Fail the first non-current revocation, succeed for the second.
        if (path.includes('other-uid-1')) {
          throw new Error('upstream 500');
        }
        return mockJsonResponse({}, 204);
      }
      return mockJsonResponse({}, 200);
    });

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verification-record-id');

    // Partial failure must surface a sanitized code, not a raw Error.
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error result');
    expect(result.error).toBe('SESSION_REVOKE_PARTIAL');
    // No raw upstream detail (count/total) leaked to the client.
    expect(result.error).not.toContain('Failed to revoke');
    expect(result.error).not.toMatch(/\d+ of \d+/);

    // The successful revocation (other-uid-2) MUST have a per-session audit
    // record even though the bulk operation failed.
    expect(auditSafe).toHaveBeenCalledWith(
      'user-test-123',
      'session.revoke',
      'other-uid-2',
      { revokeGrantsTarget: 'firstParty' },
    );
    // The failed revocation (other-uid-1) must NOT have a per-session audit
    // record (audit is written only on the fulfilled branch).
    const revokeCalls = vi.mocked(auditSafe).mock.calls.filter(
      ([, action]) => action === 'session.revoke',
    );
    expect(revokeCalls.some((call) => call[2] === 'other-uid-1')).toBe(false);
    // The bulk 'session.revoke.all' audit must NOT be written on partial failure.
    expect(auditSafe).not.toHaveBeenCalledWith(
      'user-test-123',
      'session.revoke.all',
      expect.anything(),
      expect.anything(),
    );
  });
});

describe('sealed-verification staleness checks', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('fails getUserSessions with VERIFICATION_EXPIRED when verification is expired/missing', async () => {
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const { getUserSessions } = await import('./sessions');
    const result = await getUserSessions('verif_expired');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('fails getSessionsWithDeviceMeta with VERIFICATION_EXPIRED when verification is expired/missing', async () => {
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verif_expired');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('fails revokeUserSession with VERIFICATION_EXPIRED when verification is expired/missing', async () => {
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const { revokeUserSession } = await import('./sessions');
    const result = await revokeUserSession('session-1', 'verif_expired');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('fails revokeAllOtherSessions with VERIFICATION_EXPIRED when verification is expired/missing', async () => {
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verif_expired');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('fails getUserGrants with VERIFICATION_EXPIRED when verification is expired/missing', async () => {
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const { getUserGrants } = await import('./sessions');
    const result = await getUserGrants('verif_expired');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('fails revokeUserGrant with VERIFICATION_EXPIRED when verification is expired/missing', async () => {
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const { revokeUserGrant } = await import('./sessions');
    const result = await revokeUserGrant('grant-1', 'verif_expired');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(makeRequest).not.toHaveBeenCalled();
  });
});

// ============================================================================
// LOW-2: Single session revocation defaults to revokeGrantsTarget='all'
// ============================================================================

describe('revokeUserSession default revokeGrantsTarget (LOW-2)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue({
      status: 204,
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response);
  });

  it('passes revokeGrantsTarget=all by default (LOW-2 security default)', async () => {
    const capturedRequests: Array<{ path: string; opts?: Record<string, unknown> }> = [];

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      capturedRequests.push({ path, opts: opts as Record<string, unknown> });
      return {
        status: 204,
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response;
    });

    const { revokeUserSession } = await import('./sessions');
    const result = await revokeUserSession('session-abc', 'verif-id');

    expect(result.ok).toBe(true);
    const deleteReq = capturedRequests.find(r => r.opts?.method === 'DELETE');
    expect(deleteReq).toBeDefined();
    // The query object should include revokeGrantsTarget=all
    expect(deleteReq?.opts?.query).toEqual({ revokeGrantsTarget: 'all' });
  });

  it('allows overriding revokeGrantsTarget to firstParty when explicitly passed', async () => {
    const capturedRequests: Array<{ path: string; opts?: Record<string, unknown> }> = [];

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      capturedRequests.push({ path, opts: opts as Record<string, unknown> });
      return {
        status: 204,
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response;
    });

    const { revokeUserSession } = await import('./sessions');
    const result = await revokeUserSession('session-abc', 'verif-id', 'firstParty');

    expect(result.ok).toBe(true);
    const deleteReq = capturedRequests.find(r => r.opts?.method === 'DELETE');
    expect(deleteReq?.opts?.query).toEqual({ revokeGrantsTarget: 'firstParty' });
  });

  it('revokeAllOtherSessions still uses firstParty (intentional for bulk revocation)', async () => {
    const currentSession = {
      payload: { exp: 9999999999, iat: 1700000000, jti: 'jti-current', uid: 'current-uid', kind: 'Session' as const, loginTs: 1700000000, accountId: 'acct_1' },
      lastSubmission: { interactionEvent: 'SignIn' as const, userId: 'user_1', verificationRecords: [], signInContext: { userAgent: '', ip: '1.2.3.4' } },
      clientId: 'app_1',
      accountId: 'acct_1',
      expiresAt: 9999999999,
      meta: null,
      isCurrent: true,
    };
    const otherSession = {
      payload: { exp: 9999999999, iat: 1700000000, jti: 'jti-other', uid: 'other-uid', kind: 'Session' as const, loginTs: 1700000000, accountId: 'acct_1' },
      lastSubmission: { interactionEvent: 'SignIn' as const, userId: 'user_1', verificationRecords: [], signInContext: { userAgent: '', ip: '2.3.4.5' } },
      clientId: 'app_1',
      accountId: 'acct_1',
      expiresAt: 9999999999,
      meta: null,
      isCurrent: false,
    };

    const capturedRequests: Array<{ path: string; opts?: Record<string, unknown> }> = [];

    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      capturedRequests.push({ path, opts: opts as Record<string, unknown> });
      if (!opts?.method || opts.method === 'GET') {
        return { status: 200, ok: true, json: vi.fn().mockResolvedValue({ sessions: [currentSession, otherSession] }) } as unknown as Response;
      }
      return { status: 204, ok: true, json: vi.fn().mockResolvedValue({}) } as unknown as Response;
    });

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verif-id');

    expect(result.ok).toBe(true);
    const deleteReq = capturedRequests.find(r => r.opts?.method === 'DELETE');
    // revokeAllOtherSessions intentionally uses 'firstParty' - do NOT change this
    expect(deleteReq?.opts?.query).toEqual({ revokeGrantsTarget: 'firstParty' });
  });
});

// ============================================================================
// BUG-002: internal helpers must NOT be exported as client-callable Server Actions
// ============================================================================

describe('server action export surface (BUG-002)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('does not export revokeUserSessionInternal (would bypass verification + audit)', async () => {
    const mod = await import('./sessions');
    // A non-exported function in a 'use server' file is absent from the
    // module namespace and therefore NOT callable via RPC.
    expect((mod as Record<string, unknown>).revokeUserSessionInternal).toBeUndefined();
  });

  it('does not export getUserSessionsInternal', async () => {
    const mod = await import('./sessions');
    expect((mod as Record<string, unknown>).getUserSessionsInternal).toBeUndefined();
  });

  it('still exports the public wrappers (verification-enforced + audited)', async () => {
    const mod = await import('./sessions');
    expect(typeof mod.revokeUserSession).toBe('function');
    expect(typeof mod.revokeAllOtherSessions).toBe('function');
    expect(typeof mod.getUserSessions).toBe('function');
    expect(typeof mod.getSessionsWithDeviceMeta).toBe('function');
    expect(typeof mod.getUserGrants).toBe('function');
    expect(typeof mod.revokeUserGrant).toBe('function');
  });
});
