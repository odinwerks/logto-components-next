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
 * `opts.authorizations` maps clientId -> { sid } (per-client OIDC sid, post-R1 wire).
 */
const mockSession = (
  uid: string,
  isCurrent?: boolean,
  opts?: {
    authorizations?: Record<string, { sid?: string; grantId?: string; persistsLogout?: boolean }>;
    expiresAt?: number;
    accountId?: string | null;
    payloadAccountId?: string;
  },
): LogtoSession => ({
  payload: {
    exp: 9999999999,
    iat: 1700000000,
    jti: `jti-${uid}`,
    uid,
    kind: 'Session' as const,
    loginTs: 1700000000,
    accountId: opts?.payloadAccountId ?? 'acct_1',
    ...(opts?.authorizations !== undefined ? { authorizations: opts.authorizations } : {}),
  },
  lastSubmission: {
    interactionEvent: 'SignIn' as const,
    userId: 'user_1',
    verificationRecords: [],
    signInContext: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', ip: '1.2.3.4' },
  },
  clientId: 'app_1',
  accountId: opts?.accountId === undefined ? 'acct_1' : opts.accountId,
  expiresAt: opts?.expiresAt ?? 9999999999,
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

  it('fails closed as current when both sid and the API isCurrent field are absent (M-035)', async () => {
    // No `sid` or `isCurrent` signal: the row must not expose revocation controls.
    const session = mockSession('session-b', undefined);
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

  it('resolves the current session via payload.authorizations[client_id].sid when sid differs from payload.uid (post-R1 wire)', async () => {
    // Post-R1 token carries a per-client `sid` that is NOT `payload.uid`.
    // The durable association is `authorizations[client_id].sid === sid`.
    // payloadAccountId === introspection.sub (same-subject binding).
    const matchingSession = mockSession('uid-current-xyz', true, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
      payloadAccountId: 'user-test-123',
    });
    const otherSession = mockSession('uid-other-123', false);
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [matchingSession, otherSession] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0].meta?.isCurrent).toBe(true);
    expect(result.data[1].meta?.isCurrent).toBe(false);
  });

  it('resolves via authorizations map when upstream markers are absent (sid present, no isCurrent fields)', async () => {
    const matchingSession = mockSession('uid-current-xyz', undefined, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
      payloadAccountId: 'user-test-123',
    });
    const otherSession = mockSession('uid-other-123', undefined);
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [matchingSession, otherSession] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data[0].meta?.isCurrent).toBe(true);
    expect(result.data[1].meta?.isCurrent).toBe(false);
  });

  it('fails closed when sid only matches a DIFFERENT client authorization map (wrong-client sid)', async () => {
    const wrongClient = mockSession('uid-a', false, {
      authorizations: { other_app: { sid: 'per-client-sid-abc' } },
    });
    const other = mockSession('uid-b', false);
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [wrongClient, other] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(s => s.meta?.isCurrent)).toEqual([true, true]);
  });

  it('fails closed when sid matches TWO rows in the same client authorization map (duplicate sid)', async () => {
    const a = mockSession('uid-a', false, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
    });
    const b = mockSession('uid-b', false, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
    });
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [a, b] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(s => s.meta?.isCurrent)).toEqual([true, true]);
  });

  it('fails closed when the sid-matched row is expired (stale-sid resurrection)', async () => {
    const expired = mockSession('uid-dead', undefined, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
      expiresAt: 1700000000000, // epoch ms, in the past
    });
    const other = mockSession('uid-live', undefined);
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [expired, other] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(s => s.meta?.isCurrent)).toEqual([true, true]);
  });

  it('fails closed when sid-matched row is isCurrent:false and upstream reports zero current (explicit-zero markers)', async () => {
    const dead = mockSession('uid-dead', false, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
    });
    const other = mockSession('uid-live', false);
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [dead, other] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(s => s.meta?.isCurrent)).toEqual([true, true]);
  });

  it('fails closed when a unique sid match conflicts with upstream isCurrent:true on a different row', async () => {
    const sidMatch = mockSession('uid-a', false, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
    });
    const upstreamMatch = mockSession('uid-b', true);
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [sidMatch, upstreamMatch] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(s => s.meta?.isCurrent)).toEqual([true, true]);
  });

  it('fails closed when sid is present but introspection.client_id is absent', async () => {
    const matchingSession = mockSession('uid-current-xyz', true, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
    });
    const other = mockSession('uid-other-123', false);
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      // client_id absent
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [matchingSession, other] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(s => s.meta?.isCurrent)).toEqual([true, true]);
  });

  it('preserves device metadata (lastActive, ip, browser, createdAt) on the resolved row (post-R1 wire)', async () => {
    const matchingSession = mockSession('uid-current-xyz', true, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
      payloadAccountId: 'user-test-123',
    });
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ sessions: [matchingSession] })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const meta = result.data[0].meta;
    expect(meta?.isCurrent).toBe(true);
    expect(meta?.ip).toBe('1.2.3.4');
    expect(meta?.browser).toBe('Chrome');
    expect(meta?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // lastActive comes from lastActiveAt; mockSession leaves it undefined -> null
    expect(meta?.lastActive).toBeNull();
  });

  it('marks all rows non-revocable when sid matches no returned session (M-035)', async () => {
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'missing-session',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({
        sessions: [
          mockSession('session-a', false),
          mockSession('session-b', false),
        ],
      })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(session => session.meta?.isCurrent)).toEqual([true, true]);
  });

  it('marks all rows non-revocable when sid matches multiple returned sessions (M-035)', async () => {
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'duplicate-session',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({
        sessions: [
          mockSession('duplicate-session', false),
          mockSession('duplicate-session', false),
          mockSession('other-session', false),
        ],
      })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(session => session.meta?.isCurrent)).toEqual([true, true, true]);
  });

  it('marks all rows non-revocable when sid conflicts with upstream isCurrent (M-035)', async () => {
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'sid-current-session',
    });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({
        sessions: [
          mockSession('sid-current-session', false),
          mockSession('upstream-current-session', true),
          mockSession('other-session', false),
        ],
      })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(session => session.meta?.isCurrent)).toEqual([true, true, true]);
  });

  it('marks all rows non-revocable when sid absent and no upstream isCurrent marker exists (all-false rows)', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({
        sessions: [
          mockSession('session-c', false),
          mockSession('session-d', false),
        ],
      })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(session => session.meta?.isCurrent)).toEqual([true, true]);
  });

  it('marks all rows non-revocable when sid absent and upstream markers mix false and absent', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({
        sessions: [
          mockSession('session-e', false),
          mockSession('session-f', undefined),
          mockSession('session-g', false),
        ],
      })
    );

    const { getSessionsWithDeviceMeta } = await import('./sessions');
    const result = await getSessionsWithDeviceMeta('verification-record-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map(session => session.meta?.isCurrent)).toEqual([true, true, true]);
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

    // Post-R1 premise: per-client sid resolves via authorizations[client_id].sid,
    // never via payload.uid. uid and jti stay distinct for the DELETE-path check.
    sessions[0].payload.authorizations = { app_1: { sid: 'per-client-sid-abc' } };
    // Same-subject binding: payload.accountId must equal introspection.sub.
    sessions[0].payload.accountId = 'user-test-123';

    // Mock introspection to return a per-client sid + audience-validated client_id.
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });

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

  it('revokes only other uids on the post-R1 wire (sid resolves via authorizations[client_id].sid)', async () => {
    const currentSession = mockSession('uid-current-xyz', true, {
      authorizations: { app_1: { sid: 'per-client-sid-abc' } },
      payloadAccountId: 'user-test-123',
    });
    const otherSession1 = mockSession('uid-other-1', false);
    const otherSession2 = mockSession('uid-other-2', false);
    vi.mocked(introspectToken).mockResolvedValue({
      sub: 'user-test-123',
      active: true,
      sid: 'per-client-sid-abc',
      client_id: 'app_1',
    });

    const deletedPaths: string[] = [];
    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      if (!opts?.method || opts.method === 'GET') {
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
    // Only the two OTHER uids deleted; resolved current uid survives.
    expect(deletedPaths).toHaveLength(2);
    expect(deletedPaths.every(p => !p.includes('uid-current-xyz'))).toBe(true);
    expect(deletedPaths.some(p => p.includes('uid-other-1'))).toBe(true);
    expect(deletedPaths.some(p => p.includes('uid-other-2'))).toBe(true);
  });

  it.each([
    {
      name: 'wrong-client sid only matches a different client map',
      introspection: { sub: 'user-test-123', active: true, sid: 'per-client-sid-abc', client_id: 'app_1' },
      sessions: () => [
        mockSession('uid-a', false, { authorizations: { other_app: { sid: 'per-client-sid-abc' } } }),
        mockSession('uid-b', false),
      ],
    },
    {
      name: 'duplicate sid in same client map',
      introspection: { sub: 'user-test-123', active: true, sid: 'per-client-sid-abc', client_id: 'app_1' },
      sessions: () => [
        mockSession('uid-a', false, { authorizations: { app_1: { sid: 'per-client-sid-abc' } } }),
        mockSession('uid-b', false, { authorizations: { app_1: { sid: 'per-client-sid-abc' } } }),
      ],
    },
    {
      name: 'sid-matched row expired (stale-sid resurrection)',
      introspection: { sub: 'user-test-123', active: true, sid: 'per-client-sid-abc', client_id: 'app_1' },
      sessions: () => [
        mockSession('uid-dead', undefined, {
          authorizations: { app_1: { sid: 'per-client-sid-abc' } },
          expiresAt: 1700000000000,
        }),
        mockSession('uid-live', undefined),
      ],
    },
    {
      name: 'sid-matched row isCurrent:false, upstream reports zero current',
      introspection: { sub: 'user-test-123', active: true, sid: 'per-client-sid-abc', client_id: 'app_1' },
      sessions: () => [
        mockSession('uid-dead', false, { authorizations: { app_1: { sid: 'per-client-sid-abc' } } }),
        mockSession('uid-live', false),
      ],
    },
    {
      name: 'unique sid match conflicts with upstream isCurrent:true on a different row',
      introspection: { sub: 'user-test-123', active: true, sid: 'per-client-sid-abc', client_id: 'app_1' },
      sessions: () => [
        mockSession('uid-a', false, { authorizations: { app_1: { sid: 'per-client-sid-abc' } } }),
        mockSession('uid-b', true),
      ],
    },
    {
      name: 'sid present but client_id absent',
      introspection: { sub: 'user-test-123', active: true, sid: 'per-client-sid-abc' },
      sessions: () => [
        mockSession('uid-a', true, { authorizations: { app_1: { sid: 'per-client-sid-abc' } } }),
        mockSession('uid-b', false),
      ],
    },
    {
      name: 'sid absent, all rows isCurrent:false',
      introspection: { sub: 'user-test-123', active: true },
      sessions: () => [mockSession('uid-a', false), mockSession('uid-b', false)],
    },
    {
      name: 'sid absent, two rows isCurrent:true',
      introspection: { sub: 'user-test-123', active: true },
      sessions: () => [mockSession('uid-a', true), mockSession('uid-b', true)],
    },
    {
      name: 'sid absent, all isCurrent undefined',
      introspection: { sub: 'user-test-123', active: true },
      sessions: () => [mockSession('uid-a', undefined), mockSession('uid-b', undefined)],
    },
  ])('fails closed with zero DELETEs: $name', async ({ introspection, sessions }) => {
    vi.mocked(introspectToken).mockResolvedValue(introspection);

    const deletedPaths: string[] = [];
    vi.mocked(makeRequest).mockImplementation(async (path, opts) => {
      if (!opts?.method || opts.method === 'GET') {
        return mockJsonResponse({ sessions: sessions() });
      }
      if (opts.method === 'DELETE') {
        deletedPaths.push(path);
        return mockJsonResponse({}, 204);
      }
      return mockJsonResponse({}, 200);
    });

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verification-record-id');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error result');
    expect(result.error).toContain('SESSION_REVOKE_FAILED');
    // M-035: fail-closed must mean ZERO mutations.
    expect(deletedPaths).toHaveLength(0);
  });

  it('issues zero DELETEs and skips the sessions GET when sealed verification is rejected', async () => {
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const { revokeAllOtherSessions } = await import('./sessions');
    const result = await revokeAllOtherSessions('verif_expired');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error result');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    // requireVerifiedIdentity throws before getUserSessionsInternal runs.
    expect(makeRequest).not.toHaveBeenCalled();
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

  it('does not export resolveCurrentSessionUid (would be a client-callable identity-resolution oracle)', async () => {
    const mod = await import('./sessions');
    expect((mod as Record<string, unknown>).resolveCurrentSessionUid).toBeUndefined();
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
