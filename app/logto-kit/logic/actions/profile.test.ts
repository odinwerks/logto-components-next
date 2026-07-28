import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

vi.mock('./request', () => ({
  makeRequest: vi.fn(),
}));

vi.mock('./shared', () => ({
  patchMyAccount: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
  plainCode: vi.fn((code: string) => {
    const e = new Error(code);
    e.name = 'SanitizedError';
    return e;
  }),
  sanitize: vi.fn((_err: unknown, opts: { fallback: string }) => {
    const e = new Error(opts.fallback);
    e.name = 'SanitizedError';
    return e;
  }),
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

vi.mock('../utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://logto.example.com'),
  introspectToken: vi.fn().mockResolvedValue({ sub: 'user-test-123', active: true }),
}));

vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(),
}));

vi.mock('../guards', () => {
  // Define ValidationError inline to avoid module resolution issues in mock
  class ValidationError extends Error {
    constructor(message: string, public field?: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
  return {
    assertNameField: vi.fn(),
    assertUsername: vi.fn(),
    assertHttpUrl: vi.fn((value: unknown, field: string) => {
      if (value === undefined || value === null || value === '') return;
      if (typeof value !== 'string' || value.length > 2048) {
        throw new ValidationError('INVALID_URL', field);
      }
      try {
        const u = new URL(value);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          throw new ValidationError('INVALID_URL_PROTOCOL', field);
        }
      } catch {
        throw new ValidationError('INVALID_URL', field);
      }
    }),
    assertSafeUserId: vi.fn(),
    assertSafeLogtoId: vi.fn(), // BUG-M04: updateUserCustomData now uses assertSafeLogtoId
    pickPreferences: vi.fn((input: unknown) => {
      if (input === null || input === undefined) return {};
      if (typeof input !== 'object' || Array.isArray(input)) {
        throw new ValidationError('INVALID_PREFERENCES', 'Preferences');
      }
      const src = input as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      const allowedKeys = ['asOrg', 'theme', 'lang'];
      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(src, key)) {
          out[key] = src[key];
        }
      }
      return out;
    }),
    decodeLogtoAccessToken: vi.fn().mockReturnValue({ sub: 'user-test-123' }),
  };
});

vi.mock('../../config', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-mgmt-token'),
  getLogtoConfig: vi.fn().mockReturnValue({
    endpoint: 'https://logto.example.com',
  }),
}));

// BUG-010: profile.ts now imports requireVerifiedIdentity for the username-
// change path. Mock the verification cookie module (mirrors webauthn/account/
// sessions/mfa/password test files) to avoid next/headers runtime in tests.
vi.mock('./verification-cookie', () => ({
  requireVerifiedIdentity: vi.fn().mockResolvedValue(undefined),
  sealVerificationCookie: vi.fn().mockResolvedValue(undefined),
  clearVerificationCookie: vi.fn().mockResolvedValue(undefined),
}));

// BUG-063: spy on auditSafe to assert avatar URL updates are audited.
// profile.ts only imports auditSafe from ./helpers (createLockManager comes
// from ../../../lib/distributed-state, which stays real so lock tests work).
vi.mock('./helpers', () => ({
  auditSafe: vi.fn(),
  assertVerificationNotExpired: vi.fn(),
  createLockManager: vi.fn(),
}));

// BUG-063: spy on logEvent to assert structured events are emitted.
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

// ============================================================================
// Imports of mocked modules
// ============================================================================

import { throwOnApiError } from '../errors';
import { getLogtoContext } from '@logto/next/server-actions';
import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { getTokenForServerAction } from './tokens';
import { requireVerifiedIdentity } from './verification-cookie';
import { warn } from '../log';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Creates a mock Response that is .ok and returns the given body on .json().
 */
function mockOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    statusText: 'OK',
  } as unknown as Response;
}

/**
 * Creates a mock Response that is not .ok (simulates an API error).
 */
function mockErrorResponse(status = 400): Response {
  return {
    ok: false,
    status,
    statusText: 'Bad Request',
    text: () => Promise.resolve('Bad Request'),
  } as unknown as Response;
}

/**
 * Mimics the rejection produced by AbortSignal.timeout(15000) when the fetch
 * is aborted on timeout. AbortSignal.timeout fires with a DOMException named
 * 'TimeoutError'; fall back to a plain Error with that name in environments
 * that lack the DOMException constructor. The CAN-ACT-006 fix must map ANY
 * rejection from makeManagementFetch to the established UPDATE_FAILED code.
 */
function makeTimeoutError(): Error {
  try {
    return new DOMException('The operation timed out.', 'TimeoutError');
  } catch {
    const err = new Error('The operation timed out.');
    err.name = 'TimeoutError';
    return err;
  }
}

// ============================================================================
// updateUserCustomData - GET→merge→PATCH via Management API
// ============================================================================

describe('updateUserCustomData', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-mgmt-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(getLogtoContext).mockResolvedValue({
      claims: { sub: 'user-test-123' },
      isAuthenticated: true,
    } as unknown as Awaited<ReturnType<typeof getLogtoContext>>);
  });

  it('issues a GET then a PATCH to the Management API custom-data endpoint', async () => {
    const { updateUserCustomData } = await import('./profile');

    const existingCustomData = {
      OtherApp: { someKey: 'someValue' },
      Preferences: { lang: 'en-US' },
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse(existingCustomData))  // GET
      .mockResolvedValueOnce(mockOkResponse({}))                  // PATCH
    );

    await updateUserCustomData({ Preferences: { theme: 'dark' } });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // First call must be a GET to the Management API custom-data endpoint
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://logto.example.com/api/users/user-test-123/custom-data',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mock-mgmt-token' }),
      }),
    );

    // Second call must PATCH with only the Preferences key (shallow-merge by Logto backend)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://logto.example.com/api/users/user-test-123/custom-data',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ Authorization: 'Bearer mock-mgmt-token' }),
        body: JSON.stringify({ customData: { Preferences: { lang: 'en-US', theme: 'dark' } } }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it('merges new Preference keys without sending other top-level customData keys', async () => {
    const { updateUserCustomData } = await import('./profile');

    const existingCustomData = {
      SomeOtherApp: { data: 42 },
      Preferences: { theme: 'light' },
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse(existingCustomData))
      .mockResolvedValueOnce(mockOkResponse({}))
    );

    await updateUserCustomData({ Preferences: { lang: 'fr' } });

    const fetchMock = vi.mocked(fetch);
    const patchCall = fetchMock.mock.calls[1];
    const patchBody = JSON.parse(patchCall[1]!.body as string) as { customData: Record<string, unknown> };

    // PATCH body should only contain Preferences - NOT SomeOtherApp
    // The Management API will shallow-merge on its end, keeping SomeOtherApp intact
    expect(patchBody.customData).not.toHaveProperty('SomeOtherApp');
    expect(patchBody.customData).toEqual({
      Preferences: { theme: 'light', lang: 'fr' },
    });

    vi.unstubAllGlobals();
  });

  it('handles accounts with no existing Preferences (creates Preferences from scratch)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))  // no Preferences key
      .mockResolvedValueOnce(mockOkResponse({}))
    );

    await updateUserCustomData({ Preferences: { theme: 'dark', lang: 'en' } });

    const fetchMock = vi.mocked(fetch);
    const patchCall = fetchMock.mock.calls[1];
    const patchBody = JSON.parse(patchCall[1]!.body as string) as { customData: Record<string, unknown> };

    expect(patchBody.customData).toEqual({
      Preferences: { theme: 'dark', lang: 'en' },
    });

    vi.unstubAllGlobals();
  });

  it('handles GET returning non-ok (throws UPDATE_FAILED to prevent silent data loss)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockErrorResponse(503))  // GET fails
    );

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    // Should fail closed — never silently wipe prefs
    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });

    vi.unstubAllGlobals();
  });

  it('returns { ok: false } when PATCH fails', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))      // GET succeeds
      .mockResolvedValueOnce(mockErrorResponse(500))  // PATCH fails
    );

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(result.ok).toBe(false);

    vi.unstubAllGlobals();
  });

  it.each([
    {
      name: 'GET',
      responses: [
        {
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: () => Promise.resolve('upstream GET failure: internal host 10.0.0.5'),
        },
      ],
      expectedLog: '[updateUserCustomData] GET custom-data failed:',
    },
    {
      name: 'PATCH',
      responses: [
        mockOkResponse({}),
        {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('upstream PATCH failure: internal host 10.0.0.6'),
        },
      ],
      expectedLog: '[updateUserCustomData] Management API PATCH failed:',
    },
  ])('logs only UPDATE_FAILED for a failed custom-data $name response', async ({ responses, expectedLog }) => {
    const rawUpstreamDetail = await responses.at(-1)!.text();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(responses.shift() as Response)));

    const { updateUserCustomData } = await import('./profile');
    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });
    expect(warn).toHaveBeenCalledWith(expectedLog, 'UPDATE_FAILED');
    expect(JSON.stringify(vi.mocked(warn).mock.calls)).not.toContain(rawUpstreamDetail);

    vi.unstubAllGlobals();
  });

  it('returns early without any network call when no allowed Preference keys are provided', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn());

    await updateUserCustomData({});

    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('returns early without any network call when Preferences is an empty object', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn());

    await updateUserCustomData({ Preferences: {} });

    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('returns early without any network call when Preferences is null', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn());

    await updateUserCustomData({ Preferences: null });

    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('drops unknown keys inside Preferences (mass-assignment protection)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))
      .mockResolvedValueOnce(mockOkResponse({}))
    );

    await updateUserCustomData({
      Preferences: { theme: 'dark', evil: 'payload', injected: true },
    });

    const fetchMock = vi.mocked(fetch);
    const patchCall = fetchMock.mock.calls[1];
    const patchBody = JSON.parse(patchCall[1]!.body as string) as { customData: Record<string, unknown> };

    // Only the allowed key `theme` should be in Preferences
    expect(patchBody.customData).toEqual({
      Preferences: { theme: 'dark' },
    });

    vi.unstubAllGlobals();
  });

  it('silently drops non-Preferences top-level keys (mass-assignment guard)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))
      .mockResolvedValueOnce(mockOkResponse({}))
    );

    await updateUserCustomData({
      evil: 'should-be-dropped',
      Preferences: { theme: 'light' },
    });

    const fetchMock = vi.mocked(fetch);
    const patchCall = fetchMock.mock.calls[1];
    const patchBody = JSON.parse(patchCall[1]!.body as string) as { customData: Record<string, unknown> };

    // `evil` must NOT appear in the PATCH body
    expect(patchBody.customData).not.toHaveProperty('evil');
    expect(patchBody.customData).toEqual({ Preferences: { theme: 'light' } });

    vi.unstubAllGlobals();
  });

  it('passes through all three allowed Preference keys at once', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))
      .mockResolvedValueOnce(mockOkResponse({}))
    );

    await updateUserCustomData({
      Preferences: { theme: 'dark', lang: 'en-US', asOrg: 'org_abc123' },
    });

    const fetchMock = vi.mocked(fetch);
    const patchCall = fetchMock.mock.calls[1];
    const patchBody = JSON.parse(patchCall[1]!.body as string) as { customData: Record<string, unknown> };

    expect(patchBody.customData).toEqual({
      Preferences: { theme: 'dark', lang: 'en-US', asOrg: 'org_abc123' },
    });

    vi.unstubAllGlobals();
  });

  it('returns { ok: false } when getManagementApiToken throws', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(getManagementApiToken).mockRejectedValueOnce(
      new Error('M2M credentials not configured'),
    );

    vi.stubGlobal('fetch', vi.fn());

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('returns { ok: false } when the user is unauthenticated (inactive token)', async () => {
    const { updateUserCustomData } = await import('./profile');

    // BUG-M04: auth check now uses introspectToken, not getLogtoContext
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: 'user-test-123', active: false });

    vi.stubGlobal('fetch', vi.fn());

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('returns { ok: false } when the user ID is missing (sub not in introspection)', async () => {
    const { updateUserCustomData } = await import('./profile');

    // BUG-M04: auth check now uses introspectToken, not getLogtoContext
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: undefined, active: true });

    vi.stubGlobal('fetch', vi.fn());

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('GET request carries correct Authorization header with management token', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(getManagementApiToken).mockResolvedValueOnce('special-mgmt-token-xyz');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))
      .mockResolvedValueOnce(mockOkResponse({}))
    );

    await updateUserCustomData({ Preferences: { theme: 'light' } });

    const fetchMock = vi.mocked(fetch);
    const getCall = fetchMock.mock.calls[0];
    expect((getCall[1]!.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer special-mgmt-token-xyz',
    );

    vi.unstubAllGlobals();
  });

  it('PATCH request carries correct Authorization header and Content-Type', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(getManagementApiToken).mockResolvedValueOnce('special-mgmt-token-xyz');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))
      .mockResolvedValueOnce(mockOkResponse({}))
    );

    await updateUserCustomData({ Preferences: { theme: 'light' } });

    const fetchMock = vi.mocked(fetch);
    const patchCall = fetchMock.mock.calls[1];
    const headers = patchCall[1]!.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer special-mgmt-token-xyz');
    expect(headers['Content-Type']).toBe('application/json');

    vi.unstubAllGlobals();
  });

  it('uses per-user locking - concurrent updates from different users do not block each other', async () => {
    // Reset modules to get fresh lock map
    vi.resetModules();

    vi.mocked(getManagementApiToken).mockResolvedValue('mock-mgmt-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');

    const { updateUserCustomData } = await import('./profile');

    let resolveFirst: () => void;
    const firstCall = new Promise<void>(r => { resolveFirst = r; });

    let secondCallStarted = false;
    // BUG-M04: now uses introspectToken for user identity, not getLogtoContext
    vi.mocked(introspectToken)
      .mockResolvedValueOnce({ sub: 'user-A', active: true })
      .mockResolvedValueOnce({ sub: 'user-B', active: true });

    vi.stubGlobal('fetch', vi.fn()
      // user-A GET - blocks
      .mockImplementationOnce(async () => {
        await firstCall;
        return mockOkResponse({});
      })
      // user-A PATCH
      .mockImplementationOnce(async () => mockOkResponse({}))
      // user-B GET - starts immediately
      .mockImplementationOnce(async () => {
        secondCallStarted = true;
        return mockOkResponse({});
      })
      // user-B PATCH
      .mockImplementationOnce(async () => mockOkResponse({}))
    );

    // Start both calls concurrently
    const promise1 = updateUserCustomData({ Preferences: { theme: 'dark' } });
    const promise2 = updateUserCustomData({ Preferences: { theme: 'light' } });

    // Wait a bit for the event loop to process
    await new Promise(r => setTimeout(r, 10));

    // Second user should have started (different user, different lock)
    expect(secondCallStarted).toBe(true);

    // Now resolve first user's GET
    resolveFirst!();
    await Promise.all([promise1, promise2]);

    vi.unstubAllGlobals();
  });

  it('serializes concurrent updates from the same user', async () => {
    vi.resetModules();

    vi.mocked(getManagementApiToken).mockResolvedValue('mock-mgmt-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');
    // BUG-M04: now uses introspectToken for user identity, not getLogtoContext
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'same-user-123', active: true });

    const { updateUserCustomData } = await import('./profile');

    let resolveFirst: () => void;
    const firstCall = new Promise<void>(r => { resolveFirst = r; });

    let firstCallStarted = false;
    let secondCallStarted = false;

    vi.stubGlobal('fetch', vi.fn()
      // First call's GET - will block
      .mockImplementationOnce(async () => {
        firstCallStarted = true;
        await firstCall;
        return mockOkResponse({});
      })
      // First call's PATCH
      .mockImplementationOnce(async () => mockOkResponse({}))
      // Second call's GET - should only start AFTER first call finishes completely
      .mockImplementationOnce(async () => {
        secondCallStarted = true;
        return mockOkResponse({});
      })
      // Second call's PATCH
      .mockImplementationOnce(async () => mockOkResponse({}))
    );

    // Start both calls concurrently
    const promise1 = updateUserCustomData({ Preferences: { theme: 'dark' } });
    const promise2 = updateUserCustomData({ Preferences: { theme: 'light' } });

    // Wait a bit for the event loop
    await new Promise(r => setTimeout(r, 10));

    // First call has started
    expect(firstCallStarted).toBe(true);
    // Second call should NOT have started yet because it is queued behind the lock for 'same-user-123'
    expect(secondCallStarted).toBe(false);

    // Now resolve first call's GET, letting the first call complete (including its PATCH)
    resolveFirst!();

    // Both should eventually succeed
    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    // Now second call should have started and finished
    expect(secondCallStarted).toBe(true);

    vi.unstubAllGlobals();
  });

  it('serializes multiple rapid updates from the same user in sequence, ensuring all succeed', async () => {
    vi.resetModules();

    // BUG-M04: now uses introspectToken for user identity, not getLogtoContext
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'same-user-999', active: true });
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-mgmt-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');

    const { updateUserCustomData } = await import('./profile');

    const timeline: string[] = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url, init) => {
      const isPatch = init?.method === 'PATCH';
      const type = isPatch ? 'PATCH' : 'GET';
      timeline.push(`start-${type}`);
      await new Promise(r => setTimeout(r, 10));
      timeline.push(`end-${type}`);
      return mockOkResponse({});
    }));

    // Start three updates concurrently
    const p1 = updateUserCustomData({ Preferences: { theme: 'dark' } });
    const p2 = updateUserCustomData({ Preferences: { lang: 'en' } });
    const p3 = updateUserCustomData({ Preferences: { theme: 'light' } });

    // All should succeed
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);

    // They should have run in complete sequential blocks: GET->PATCH, then GET->PATCH, then GET->PATCH
    expect(timeline).toEqual([
      'start-GET', 'end-GET', 'start-PATCH', 'end-PATCH',
      'start-GET', 'end-GET', 'start-PATCH', 'end-PATCH',
      'start-GET', 'end-GET', 'start-PATCH', 'end-PATCH',
    ]);

    vi.unstubAllGlobals();
  });

  // ==========================================================================
  // CAN-ACT-006: Unbounded profile I/O must not outlive the lock lease.
  // The GET and PATCH inside the lock critical section now go through
  // makeManagementFetch, which applies AbortSignal.timeout(15000) — well under
  // the 30-second Redis lease — so a hanging fetch rejects at 15s and the
  // awaited finally can release the lock cleanly while the lease is still
  // valid. A rejection (timeout/abort/network) is mapped to UPDATE_FAILED,
  // never a raw TimeoutError or unhandled rejection.
  // ==========================================================================

  it('passes an AbortSignal (timeout) to the GET custom-data fetch (CAN-ACT-006)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))  // GET
      .mockResolvedValueOnce(mockOkResponse({}))  // PATCH
    );

    await updateUserCustomData({ Preferences: { theme: 'dark' } });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The GET (first call) must carry an AbortSignal so it cannot hang forever
    // and outlive the lock lease. makeManagementFetch sets
    // signal: AbortSignal.timeout(15000) by default.
    const getOpts = fetchMock.mock.calls[0][1] as RequestInit & { signal?: AbortSignal };
    expect(getOpts.signal).toBeInstanceOf(AbortSignal);

    vi.unstubAllGlobals();
  });

  it('passes an AbortSignal (timeout) to the PATCH custom-data fetch (CAN-ACT-006)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))  // GET
      .mockResolvedValueOnce(mockOkResponse({}))  // PATCH
    );

    await updateUserCustomData({ Preferences: { theme: 'dark' } });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The PATCH (second call) must also carry an AbortSignal — a hanging PATCH
    // is just as dangerous as a hanging GET for lock-lease overlap.
    const patchOpts = fetchMock.mock.calls[1][1] as RequestInit & { signal?: AbortSignal };
    expect(patchOpts.signal).toBeInstanceOf(AbortSignal);

    vi.unstubAllGlobals();
  });

  it('maps a GET timeout (fetch rejection) to UPDATE_FAILED, not a raw TimeoutError (CAN-ACT-006)', async () => {
    const { updateUserCustomData } = await import('./profile');

    // Simulate AbortSignal.timeout(15000) firing during the GET: the fetch
    // rejects with a DOMException named 'TimeoutError'.
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(makeTimeoutError())  // GET times out
    );

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    // The fixed action code is UPDATE_FAILED (the established code for this
    // action) — never the raw 'TimeoutError' string nor an unhandled rejection.
    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });
    expect(fetch).toHaveBeenCalledTimes(1);  // GET rejected → PATCH never issued

    vi.unstubAllGlobals();
  });

  it('maps a PATCH timeout (fetch rejection) to UPDATE_FAILED, not a raw TimeoutError (CAN-ACT-006)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkResponse({}))       // GET succeeds
      .mockRejectedValueOnce(makeTimeoutError())        // PATCH times out
    );

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });
    expect(fetch).toHaveBeenCalledTimes(2);  // GET + PATCH (rejected)

    vi.unstubAllGlobals();
  });

  it.each([
    ['an abort', makeTimeoutError()],
    ['a malformed JSON error', new SyntaxError('Unexpected token < in JSON response')],
  ])('maps GET response body parsing %s to UPDATE_FAILED (CAN-ACT-006)', async (_name, jsonError) => {
    const { updateUserCustomData } = await import('./profile');

    // A fetch can resolve after headers while its body is later aborted or
    // malformed. The body read is part of the same lock-held deadline and
    // must not escape safeAction as INTERNAL_ERROR.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ...mockOkResponse({}),
      json: () => Promise.reject(jsonError),
    } as unknown as Response));

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[updateUserCustomData] GET custom-data body parse failed:',
      'UPDATE_FAILED',
    );

    vi.unstubAllGlobals();
  });

  it('releases the lock after a GET timeout so a subsequent same-user update is not blocked (CAN-ACT-006)', async () => {
    vi.resetModules();

    vi.mocked(getManagementApiToken).mockResolvedValue('mock-mgmt-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'same-user-locks', active: true });

    const { updateUserCustomData } = await import('./profile');

    // First call: GET times out. If the lock were NOT released, the second
    // call for the same user would block on acquire() for the 30s lease
    // timeout — which would exceed the vitest per-test timeout and fail.
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(makeTimeoutError())        // first GET times out
      .mockResolvedValueOnce(mockOkResponse({}))         // second GET succeeds
      .mockResolvedValueOnce(mockOkResponse({}))         // second PATCH succeeds
    );

    const result1 = await updateUserCustomData({ Preferences: { theme: 'dark' } });
    expect(result1).toEqual({ ok: false, error: 'UPDATE_FAILED' });

    // The awaited finally in updateUserCustomData must have run releaseLock(),
    // so this second same-user call acquires the lock immediately and completes.
    const result2 = await updateUserCustomData({ Preferences: { theme: 'light' } });
    expect(result2).toEqual({ ok: true });

    vi.unstubAllGlobals();
  });

  it('does not start PATCH after a slow GET consumes the shared lock budget (CAN-ACT-006)', async () => {
    const { updateUserCustomData } = await import('./profile');
    const now = vi.spyOn(Date, 'now')
      // The lock-held deadline is set immediately after acquisition.
      .mockReturnValueOnce(0)
      // The GET starts with the full shared budget available.
      .mockReturnValueOnce(0)
      // Its response arrives only when the shared budget has expired.
      .mockReturnValue(25_000);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockOkResponse({})));

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    // The action fails closed instead of allowing a second 15s request to run
    // after the GET has consumed the lock-held budget.
    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });
    expect(fetch).toHaveBeenCalledTimes(1);

    now.mockRestore();
    vi.unstubAllGlobals();
  });

});

// ============================================================================
// updateAvatarUrl - must reject non-HTTP URLs to prevent stored XSS
// ============================================================================

describe('updateAvatarUrl', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('passes a valid absolute HTTP URL through to patchMyAccount', async () => {
    const { updateAvatarUrl } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateAvatarUrl('https://cdn.example.com/avatar.png');

    expect(result).toEqual({ ok: true });
    expect(patchMyAccount).toHaveBeenCalledWith(
      { avatar: 'https://cdn.example.com/avatar.png' },
      'Avatar update failed',
    );
  });

  it.each([
    ['javascript: URL', 'javascript:alert(1)'],
    ['data: URL',       'data:image/png;base64,abc'],
    ['non-URL text',    'not-a-url-at-all'],
  ])('rejects a %s to prevent stored XSS', async (_, url) => {
    const { updateAvatarUrl } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateAvatarUrl(url);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
    expect(patchMyAccount).not.toHaveBeenCalled();
  });

  it('converts null to null avatar (removes avatar)', async () => {
    const { updateAvatarUrl } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateAvatarUrl('');

    expect(result).toEqual({ ok: true });
    expect(patchMyAccount).toHaveBeenCalledWith(
      { avatar: null },
      'Avatar update failed',
    );
  });
});

// ============================================================================
// updateUserProfile — BUG-H01: empty strings forwarded as "clear" sentinel
// ============================================================================

describe('updateUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  // BUG-H01: empty strings are a valid "clear" sentinel for Logto's Account
  // API and MUST be forwarded (not stripped). The previous filter dropped `''`,
  // so clearing both name fields returned { ok: true } without calling Logto.
  it('forwards empty strings to PATCH so Logto can clear givenName/familyName', async () => {
    const { updateUserProfile } = await import('./profile');
    const { makeRequest } = await import('./request');

    vi.mocked(makeRequest).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}'),
      statusText: 'OK',
    } as unknown as Response);

    const result = await updateUserProfile({ givenName: '', familyName: '' });

    expect(result).toEqual({ ok: true });
    expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/profile',
      expect.objectContaining({ body: { givenName: '', familyName: '' } }),
    );
  });

  // BUG-H01: an empty string alongside a non-empty value must BOTH be
  // forwarded so the server can set one field and clear the other. The
  // previous filter stripped the empty string, silently dropping the clear.
  it('forwards an empty string alongside a non-empty value', async () => {
    const { updateUserProfile } = await import('./profile');
    const { makeRequest } = await import('./request');

    vi.mocked(makeRequest).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}'),
      statusText: 'OK',
    } as unknown as Response);

    await updateUserProfile({ givenName: 'Alice', familyName: '' });

    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/profile',
      expect.objectContaining({ body: { givenName: 'Alice', familyName: '' } }),
    );
    // familyName: '' MUST appear in the body (it is a clear, not an omit)
    const callBody = vi.mocked(makeRequest).mock.calls[0][1]?.body as Record<string, unknown>;
    expect(callBody).toHaveProperty('familyName', '');
  });

  it('returns early without PATCH when both fields undefined', async () => {
    const { updateUserProfile } = await import('./profile');
    const { makeRequest } = await import('./request');

    const result = await updateUserProfile({});

    expect(result).toEqual({ ok: true });
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('sends PATCH when all fields are non-empty', async () => {
    const { updateUserProfile } = await import('./profile');
    const { makeRequest } = await import('./request');

    vi.mocked(makeRequest).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}'),
      statusText: 'OK',
    } as unknown as Response);

    await updateUserProfile({ givenName: 'Alice', familyName: 'Smith' });

    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/profile',
      expect.objectContaining({ body: { givenName: 'Alice', familyName: 'Smith' } }),
    );
  });
});

// ============================================================================
// updateUserBasicInfo — BUG-H01: empty-string forwarding for name/username
// ============================================================================

describe('updateUserBasicInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(requireVerifiedIdentity).mockResolvedValue(undefined);
  });

  it('forwards name: "" to patchMyAccount so Logto can clear the name', async () => {
    const { updateUserBasicInfo } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateUserBasicInfo({ name: '' });

    expect(result).toEqual({ ok: true });
    expect(patchMyAccount).toHaveBeenCalledTimes(1);
    expect(patchMyAccount).toHaveBeenCalledWith({ name: '' }, 'Basic info update failed', undefined);
  });

  it('forwards username: "" to patchMyAccount so Logto can clear the username', async () => {
    const { updateUserBasicInfo } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    // username changes require the logto-verification-id header
    const result = await updateUserBasicInfo({ username: '' }, 'verification-record-id');

    expect(result).toEqual({ ok: true });
    expect(patchMyAccount).toHaveBeenCalledTimes(1);
    expect(patchMyAccount).toHaveBeenCalledWith(
      { username: '' },
      'Basic info update failed',
      { 'logto-verification-id': 'verification-record-id' },
    );
  });

  it('forwards both name and username when both are provided', async () => {
    const { updateUserBasicInfo } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateUserBasicInfo(
      { name: 'Alice', username: 'alice1' },
      'verification-record-id',
    );

    expect(result).toEqual({ ok: true });
    expect(patchMyAccount).toHaveBeenCalledWith(
      { name: 'Alice', username: 'alice1' },
      'Basic info update failed',
      { 'logto-verification-id': 'verification-record-id' },
    );
  });

  it('returns early without PATCH when all fields are undefined', async () => {
    const { updateUserBasicInfo } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateUserBasicInfo({});

    expect(result).toEqual({ ok: true });
    expect(patchMyAccount).not.toHaveBeenCalled();
  });

  // BUG-H01: avatar is NOT in the "accepts '' as clear" list — clearing the
  // avatar uses `null` via the dedicated updateAvatarUrl path. An empty avatar
  // string must still be stripped to avoid an unintended write.
  it('strips an empty avatar string (clearing uses null via updateAvatarUrl)', async () => {
    const { updateUserBasicInfo } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateUserBasicInfo({ avatar: '' });

    expect(result).toEqual({ ok: true });
    expect(patchMyAccount).not.toHaveBeenCalled();
  });

  it('forwards name: "" alongside a real avatar URL', async () => {
    const { updateUserBasicInfo } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateUserBasicInfo({ name: '', avatar: 'https://cdn.example.com/a.png' });

    expect(result).toEqual({ ok: true });
    expect(patchMyAccount).toHaveBeenCalledWith(
      { name: '', avatar: 'https://cdn.example.com/a.png' },
      'Basic info update failed',
      undefined,
    );
  });

  it('requires a verification record id when username is changed', async () => {
    const { updateUserBasicInfo } = await import('./profile');
    const { patchMyAccount } = await import('./shared');

    const result = await updateUserBasicInfo({ username: 'newname' });

    expect(result.ok).toBe(false);
    expect(patchMyAccount).not.toHaveBeenCalled();
  });
});
