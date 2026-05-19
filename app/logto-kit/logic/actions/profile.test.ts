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

// ============================================================================
// Imports of mocked modules
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';

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
  } as unknown as Response;
}

/**
 * Creates a mock Response that is not .ok (simulates an API error).
 */
function mockErrorResponse(status = 400): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve('Bad Request'),
  } as unknown as Response;
}

// ============================================================================
// updateUserCustomData — GET→merge→PATCH (Logto replaces, never merges)
// ============================================================================

describe('updateUserCustomData', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('issues a GET then a PATCH with the merged customData', async () => {
    const { updateUserCustomData } = await import('./profile');

    const existingAccount = {
      customData: {
        OtherApp: { someKey: 'someValue' },
        Preferences: { lang: 'en-US' },
      },
    };
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse(existingAccount)) // GET
      .mockResolvedValueOnce(mockOkResponse({}));              // PATCH

    await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(makeRequest).toHaveBeenCalledTimes(2);

    // First call must be a GET
    expect(makeRequest).toHaveBeenNthCalledWith(1, '/api/my-account', { method: 'GET' });

    // Second call must PATCH with all existing keys preserved + new prefs merged
    expect(makeRequest).toHaveBeenNthCalledWith(2, '/api/my-account', {
      method: 'PATCH',
      body: {
        customData: {
          OtherApp: { someKey: 'someValue' },
          Preferences: { lang: 'en-US', theme: 'dark' },
        },
      },
    });
  });

  it('merges new Preference keys without overwriting unrelated top-level customData keys', async () => {
    const { updateUserCustomData } = await import('./profile');

    const existingAccount = {
      customData: {
        SomeOtherApp: { data: 42 },
        Preferences: { theme: 'light' },
      },
    };
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse(existingAccount))
      .mockResolvedValueOnce(mockOkResponse({}));

    await updateUserCustomData({ Preferences: { lang: 'fr' } });

    const patchCall = vi.mocked(makeRequest).mock.calls[1];
    const patchBody = (patchCall[1] as { body: { customData: Record<string, unknown> } }).body.customData;

    expect(patchBody).toMatchObject({
      SomeOtherApp: { data: 42 },    // untouched
      Preferences: { theme: 'light', lang: 'fr' }, // merged
    });
  });

  it('handles accounts with no existing customData (creates Preferences from scratch)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse({ customData: {} }))
      .mockResolvedValueOnce(mockOkResponse({}));

    await updateUserCustomData({ Preferences: { theme: 'dark', lang: 'en' } });

    const patchCall = vi.mocked(makeRequest).mock.calls[1];
    const patchBody = (patchCall[1] as { body: { customData: Record<string, unknown> } }).body.customData;

    expect(patchBody).toEqual({
      Preferences: { theme: 'dark', lang: 'en' },
    });
  });

  it('handles accounts with missing customData field entirely', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse({})) // no customData key
      .mockResolvedValueOnce(mockOkResponse({}));

    await updateUserCustomData({ Preferences: { asOrg: 'org_abc123' } });

    const patchCall = vi.mocked(makeRequest).mock.calls[1];
    const patchBody = (patchCall[1] as { body: { customData: Record<string, unknown> } }).body.customData;

    expect(patchBody).toEqual({
      Preferences: { asOrg: 'org_abc123' },
    });
  });

  it('returns early without any network call when no allowed Preference keys are provided', async () => {
    const { updateUserCustomData } = await import('./profile');

    await updateUserCustomData({});

    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('returns early without any network call when Preferences is an empty object', async () => {
    const { updateUserCustomData } = await import('./profile');

    await updateUserCustomData({ Preferences: {} });

    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('returns early without any network call when Preferences is null', async () => {
    const { updateUserCustomData } = await import('./profile');

    await updateUserCustomData({ Preferences: null });

    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('drops unknown keys inside Preferences (mass-assignment protection)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse({ customData: {} }))
      .mockResolvedValueOnce(mockOkResponse({}));

    await updateUserCustomData({
      Preferences: { theme: 'dark', evil: 'payload', injected: true },
    });

    const patchCall = vi.mocked(makeRequest).mock.calls[1];
    const patchBody = (patchCall[1] as { body: { customData: Record<string, unknown> } }).body.customData;

    // Only the allowed key `theme` should be in Preferences
    expect(patchBody).toEqual({
      Preferences: { theme: 'dark' },
    });
  });

  it('silently drops non-Preferences top-level keys (mass-assignment guard)', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse({ customData: {} }))
      .mockResolvedValueOnce(mockOkResponse({}));

    await updateUserCustomData({
      evil: 'should-be-dropped',
      Preferences: { theme: 'light' },
    });

    const patchCall = vi.mocked(makeRequest).mock.calls[1];
    const patchBody = (patchCall[1] as { body: { customData: Record<string, unknown> } }).body.customData;

    // `evil` must NOT appear in the PATCH body
    expect(patchBody).not.toHaveProperty('evil');
    expect(patchBody).toEqual({ Preferences: { theme: 'light' } });
  });

  it('passes through all three allowed Preference keys at once', async () => {
    const { updateUserCustomData } = await import('./profile');

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse({ customData: {} }))
      .mockResolvedValueOnce(mockOkResponse({}));

    await updateUserCustomData({
      Preferences: { theme: 'dark', lang: 'en-US', asOrg: 'org_abc123' },
    });

    const patchCall = vi.mocked(makeRequest).mock.calls[1];
    const patchBody = (patchCall[1] as { body: { customData: Record<string, unknown> } }).body.customData;

    expect(patchBody).toEqual({
      Preferences: { theme: 'dark', lang: 'en-US', asOrg: 'org_abc123' },
    });
  });

  it('calls throwOnApiError for the GET response', async () => {
    const { updateUserCustomData } = await import('./profile');

    const getResponse = mockOkResponse({ customData: {} });
    const patchResponse = mockOkResponse({});
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(getResponse)
      .mockResolvedValueOnce(patchResponse);

    await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(throwOnApiError).toHaveBeenCalledWith(
      getResponse,
      'FETCH_FAILED',
      'Get my account for customData merge',
    );
  });

  it('calls throwOnApiError for the PATCH response', async () => {
    const { updateUserCustomData } = await import('./profile');

    const patchResponse = mockOkResponse({});
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse({ customData: {} }))
      .mockResolvedValueOnce(patchResponse);

    await updateUserCustomData({ Preferences: { theme: 'dark' } });

    expect(throwOnApiError).toHaveBeenCalledWith(
      patchResponse,
      'UPDATE_FAILED',
      'Update custom data',
    );
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
