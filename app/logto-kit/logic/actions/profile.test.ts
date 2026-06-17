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

// ============================================================================
// Imports of mocked modules
// ============================================================================

import { throwOnApiError } from '../errors';
import { getLogtoContext } from '@logto/next/server-actions';
import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { getTokenForServerAction } from './tokens';

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

  it('returns { ok: false } when the user is unauthenticated', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(getLogtoContext).mockResolvedValueOnce({
      claims: { sub: 'user-test-123' },
      isAuthenticated: false,
    } as unknown as Awaited<ReturnType<typeof getLogtoContext>>);

    vi.stubGlobal('fetch', vi.fn());

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('returns { ok: false } when the user ID is missing', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(getLogtoContext).mockResolvedValueOnce({
      claims: {},
      isAuthenticated: true,
    } as unknown as Awaited<ReturnType<typeof getLogtoContext>>);

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
    vi.mocked(getLogtoContext)
      .mockResolvedValueOnce({ claims: { sub: 'user-A' }, isAuthenticated: true } as unknown as Awaited<ReturnType<typeof getLogtoContext>>)
      .mockResolvedValueOnce({ claims: { sub: 'user-B' }, isAuthenticated: true } as unknown as Awaited<ReturnType<typeof getLogtoContext>>);

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
    vi.mocked(getLogtoContext).mockResolvedValue({ claims: { sub: 'same-user-123' }, isAuthenticated: true } as unknown as Awaited<ReturnType<typeof getLogtoContext>>);

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

    vi.mocked(getLogtoContext).mockResolvedValue({ claims: { sub: 'same-user-999' }, isAuthenticated: true } as unknown as Awaited<ReturnType<typeof getLogtoContext>>);
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
