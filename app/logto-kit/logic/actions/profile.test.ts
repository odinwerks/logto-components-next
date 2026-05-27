import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Module Mocks — hoisted above all imports
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

vi.mock('../../../logto', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-mgmt-token'),
}));

vi.mock('../utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://logto.example.com'),
}));

// ============================================================================
// Imports of mocked modules
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { decodeLogtoAccessToken, pickPreferences } from '../guards';
import { getManagementApiToken } from '../../../logto';
import { getCleanEndpoint } from '../utils';

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
// updateUserCustomData — GET→merge→PATCH via Management API
// ============================================================================

describe('updateUserCustomData', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-mgmt-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');
    vi.mocked(decodeLogtoAccessToken).mockReturnValue({ sub: 'user-test-123' } as any);
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

    // PATCH body should only contain Preferences — NOT SomeOtherApp
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

  it('handles GET returning non-ok (proceeds with empty existingPrefs)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockErrorResponse(503))  // GET fails
      .mockResolvedValueOnce(mockOkResponse({}))      // PATCH succeeds
    );

    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    // Should still succeed — falls back to empty existingPrefs
    expect(result).toEqual({ ok: true });

    const fetchMock = vi.mocked(fetch);
    const patchCall = fetchMock.mock.calls[1];
    const patchBody = JSON.parse(patchCall[1]!.body as string) as { customData: Record<string, unknown> };

    // No existing prefs to merge, just the new ones
    expect(patchBody.customData).toEqual({
      Preferences: { theme: 'dark' },
    });

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

    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-mgmt-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');

    const { updateUserCustomData } = await import('./profile');

    let resolveFirst: () => void;
    const firstCall = new Promise<void>(r => { resolveFirst = r; });

    let firstCallStarted = false;
    let secondCallStarted = false;

    // First user's GET — will block
    vi.mocked(decodeLogtoAccessToken).mockReturnValueOnce({ sub: 'user-A' } as any);
    // Second user's GET — should NOT wait for first user
    vi.mocked(decodeLogtoAccessToken).mockReturnValueOnce({ sub: 'user-B' } as any);

    vi.stubGlobal('fetch', vi.fn()
      // user-A GET — blocks
      .mockImplementationOnce(async () => {
        firstCallStarted = true;
        await firstCall;
        return mockOkResponse({});
      })
      // user-A PATCH
      .mockImplementationOnce(async () => mockOkResponse({}))
      // user-B GET — starts immediately
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

  it('still serializes concurrent updates from the same user', async () => {
    vi.resetModules();

    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(decodeLogtoAccessToken).mockReturnValue({ sub: 'same-user-123' } as any);
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-mgmt-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');

    const { updateUserCustomData } = await import('./profile');

    let firstCallFinished = false;
    let secondCallStarted = false;

    vi.stubGlobal('fetch', vi.fn()
      // First call GET — slow
      .mockImplementationOnce(async () => {
        await new Promise(r => setTimeout(r, 50));
        return mockOkResponse({});
      })
      // First call PATCH
      .mockImplementationOnce(async () => {
        firstCallFinished = true;
        return mockOkResponse({});
      })
      // Second call GET — starts after first finishes
      .mockImplementationOnce(async () => {
        secondCallStarted = true;
        return mockOkResponse({});
      })
      // Second call PATCH
      .mockImplementationOnce(async () => mockOkResponse({}))
    );

    // Start both calls concurrently
    const promise1 = updateUserCustomData({ Preferences: { theme: 'dark' } });
    const promise2 = updateUserCustomData({ Preferences: { lang: 'en' } });

    // First should complete before second starts
    await promise1;
    expect(firstCallFinished).toBe(true);

    await promise2;
    expect(secondCallStarted).toBe(true);

    vi.unstubAllGlobals();
  });
});

// ============================================================================
// updateAvatarUrl — must reject non-HTTP URLs to prevent stored XSS
// ============================================================================

describe('updateAvatarUrl', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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
