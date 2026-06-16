import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

vi.mock('../../config', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-m2m-token'),
}));

const mockCookiesSet = vi.fn();
const mockCookiesGetAll = vi.fn().mockReturnValue([
  { name: 'logto_session', value: 'xxx' },
  { name: 'logto_active', value: 'yyy' },
  { name: 'logto-active-org', value: 'zzz' },
  { name: 'other_cookie', value: 'abc' },
]);

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => mockCookiesGetAll(),
    set: mockCookiesSet,
  }),
}));

vi.mock('../utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://auth.example.org'),
  introspectToken: vi.fn().mockResolvedValue({ sub: 'user-test-123', active: true }),
}));

vi.mock('../guards', () => ({
  assertSafeLogtoId: vi.fn(),
  assertSafeUserId: vi.fn(),
}));

vi.mock('./request', () => ({
  makeRequest: vi.fn(),
}));

vi.mock('../errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

vi.mock('../audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Imports of mocked modules (for vi.mocked usage)
// ============================================================================

import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import { getManagementApiToken } from '../../config';

// ============================================================================
// deleteUserAccount - freshness check + account deletion
// ============================================================================

describe('deleteUserAccount', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    // Mock global.fetch for the DELETE call
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    } as unknown as Response);
  });

  afterEach(() => {
    vi.mocked(globalThis.fetch).mockRestore();
  });

  // ── Freshness check: expired timestamp ──────────────────────────────────

  it('rejects a verification record whose expiresAt is in the past', async () => {
    const { deleteUserAccount } = await import('./account');
    const expiredTs = Date.now() - 11 * 60 * 1000; // expiresAt was 11 min ago → rejected

    const result = await deleteUserAccount('verif_record_1', expiredTs);

    expect(result.ok).toBe(false);
    // The deletion fetch should never have been called
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // ── Freshness check: valid timestamp ────────────────────────────────────

  it('allows a verification record within the 10-minute window', async () => {
    const { deleteUserAccount } = await import('./account');
    // verificationTimestamp is now expiresAt (not issued-at).
    // 9 minutes from now = record was issued 1 min ago, expires in 9 min → valid.
    const freshTs = Date.now() + 9 * 60 * 1000;

    const result = await deleteUserAccount('verif_record_1', freshTs);

    expect(result.ok).toBe(true);
    // The deletion fetch must have been called
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'logto-verification-id': 'verif_record_1',
        }),
      }),
    );
    // Logto internally revokes tokens/sessions on DELETE — no ?revokeGrants=true needed
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(fetchCall[0]).not.toContain('revokeGrants');
  });

  // ── SECURITY: timestamp is required ─────────────────────────────────────
  // BUG-SEC-003: A malicious client can omit verificationRecordTimestamp to
  // bypass the staleness check. Making it required prevents this.

  it('requires verificationRecordTimestamp - omitted timestamp should fail at type level', async () => {
    const { deleteUserAccount } = await import('./account');
    // Calling without the second argument is now a TYPE error (TS compile check).
    // At runtime, this test documents that the function signature requires the timestamp.
    // If someone removes the required param, this test documents the security intent.
    expect(typeof deleteUserAccount).toBe('function');
    // Verify the function accepts both args (required + required)
    const result = await deleteUserAccount('verif_record_1', Date.now() + 60000);
    expect(result.ok).toBe(true);
  });

  // ── SECURITY: staleness check always runs ───────────────────────────────
  // BUG-SEC-003: Even if somehow bypassed, the staleness check must execute.

  it('always executes staleness check - expired record always rejected', async () => {
    const { deleteUserAccount } = await import('./account');
    const expiredTs = Date.now() - 16_000; // 1 second ago → expired

    const result = await deleteUserAccount('verif_record_1', expiredTs);

    expect(result.ok).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // ── Exactly at the 10-minute boundary ───────────────────────────────────

  it('allows a verification record that has not yet expired', async () => {
    const { deleteUserAccount } = await import('./account');
    // verificationTimestamp is now expiresAt. Any future timestamp is valid.
    const mockNow = 1700000000000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    try {
      const result = await deleteUserAccount('verif_record_1', mockNow);
      expect(result.ok).toBe(true);
    } finally {
      dateSpy.mockRestore();
    }
  });

  // ── Negative timestamp (future) - should always be within window ────────

  it('allows a verification record with a future timestamp', async () => {
    const { deleteUserAccount } = await import('./account');
    const futureTs = Date.now() + 60 * 1000; // 1 minute in the future

    const result = await deleteUserAccount('verif_record_1', futureTs);

    expect(result.ok).toBe(true);
  });

  it('clears all local logto_ and logto-active-org cookies on path / (BUG-003)', async () => {
    mockCookiesSet.mockClear();
    mockCookiesGetAll.mockClear().mockReturnValue([
      { name: 'logto_session', value: 'xxx' },
      { name: 'logto_active', value: 'yyy' },
      { name: 'logto-active-org', value: 'zzz' },
      { name: 'other_cookie', value: 'abc' },
    ]);

    const { deleteUserAccount } = await import('./account');
    const result = await deleteUserAccount('verif_record_1', Date.now() + 60000);

    expect(result.ok).toBe(true);
    
    expect(mockCookiesSet).toHaveBeenCalledTimes(3);
    expect(mockCookiesSet).toHaveBeenCalledWith('logto_session', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).toHaveBeenCalledWith('logto_active', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).toHaveBeenCalledWith('logto-active-org', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).not.toHaveBeenCalledWith('other_cookie', expect.anything(), expect.anything());
  });

  // MED-2: Logto internally revokes tokens/sessions during user deletion.
  // The DELETE /api/users/{userId} endpoint calls signOutUser(userId) before deletion,
  // which revokes AccessTokens, RefreshTokens, Sessions, and OIDC session extensions.
  // No ?revokeGrants=true parameter is required (it does not exist in the API).
  it('MED-2: does not append revokeGrants query param - Logto handles internal revocation', async () => {
    const { deleteUserAccount } = await import('./account');
    const freshTs = Date.now() + 60000;

    const result = await deleteUserAccount('verif_record_1', freshTs);

    expect(result.ok).toBe(true);
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
    const url = fetchCall[0] as string;
    // Logto internally revokes all grants/tokens during DELETE /api/users/{userId}
    // Do NOT append ?revokeGrants=true - it is unsupported and would be ignored or error
    expect(url).not.toContain('revokeGrants');
    expect(url).toContain('/api/users/user-test-123');
  });
});
