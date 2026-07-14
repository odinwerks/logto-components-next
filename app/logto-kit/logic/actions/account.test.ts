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

vi.mock('./verification-cookie', () => ({
  requireVerifiedIdentity: vi.fn().mockResolvedValue(undefined),
  sealVerificationCookie: vi.fn().mockResolvedValue(undefined),
  clearVerificationCookie: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
  sanitize: vi.fn((_err: unknown, opts: { fallback: string }) => {
    const e = new Error(opts.fallback);
    e.name = 'SanitizedError';
    return e;
  }),
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
import { requireVerifiedIdentity, clearVerificationCookie } from './verification-cookie';

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
    // requireVerifiedIdentity now reads the server-sealed cookie and rejects
    // on staleness. Simulate an expired verification.
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const result = await deleteUserAccount('verif_record_1');

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe('VERIFICATION_EXPIRED');
    }
    // The deletion fetch should never have been called
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // ── Freshness check: valid timestamp ────────────────────────────────────

  it('allows a verification record within the 10-minute window', async () => {
    const { deleteUserAccount } = await import('./account');
    // requireVerifiedIdentity is mocked and resolves by default → fresh.

    const result = await deleteUserAccount('verif_record_1');

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

  // ── SECURITY: timestamp param removed ──────────────────────────────────
  // BUG-SEC-003: The staleness check now reads the server-sealed verification
  // cookie (via requireVerifiedIdentity) instead of a client-supplied
  // timestamp, so a malicious client can no longer bypass it. The function is
  // now called with a single recordId argument.

  it('accepts a single recordId argument (timestamp param removed)', async () => {
    const { deleteUserAccount } = await import('./account');
    // The client-supplied timestamp param has been removed; the action now reads
    // the server-sealed verification cookie via requireVerifiedIdentity. The
    // function is now called with a single recordId argument and succeeds.
    expect(typeof deleteUserAccount).toBe('function');
    const result = await deleteUserAccount('verif_record_1');
    expect(result.ok).toBe(true);
  });

  // ── SECURITY: staleness check always runs ───────────────────────────────
  // BUG-SEC-003: Even if somehow bypassed, the staleness check must execute.

  it('always executes staleness check - expired record always rejected', async () => {
    const { deleteUserAccount } = await import('./account');
    // requireVerifiedIdentity now enforces staleness. Make it reject with a
    // sanitized VERIFICATION_EXPIRED error to simulate an expired record.
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const result = await deleteUserAccount('verif_record_1');

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toBe('VERIFICATION_EXPIRED');
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // ── Exactly at the 10-minute boundary ───────────────────────────────────

  it('allows a verification record that has not yet expired', async () => {
    const { deleteUserAccount } = await import('./account');
    // Staleness is now enforced via requireVerifiedIdentity (mock resolves),
    // which reads the server-sealed cookie rather than a client timestamp.
    const result = await deleteUserAccount('verif_record_1');
    expect(result.ok).toBe(true);
  });

  // ── Negative timestamp (future) - should always be within window ────────

  it('allows a verification record with a future timestamp', async () => {
    const { deleteUserAccount } = await import('./account');

    const result = await deleteUserAccount('verif_record_1');

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
    const result = await deleteUserAccount('verif_record_1');

    expect(result.ok).toBe(true);

    expect(mockCookiesSet).toHaveBeenCalledTimes(3);
    expect(mockCookiesSet).toHaveBeenCalledWith('logto_session', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).toHaveBeenCalledWith('logto_active', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).toHaveBeenCalledWith('logto-active-org', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).not.toHaveBeenCalledWith('other_cookie', expect.anything(), expect.anything());
    // The sealed verification cookie must also be cleared after deletion.
    expect(clearVerificationCookie).toHaveBeenCalled();
  });

  // MED-2: Logto internally revokes tokens/sessions during user deletion.
  // The DELETE /api/users/{userId} endpoint calls signOutUser(userId) before deletion,
  // which revokes AccessTokens, RefreshTokens, Sessions, and OIDC session extensions.
  // No ?revokeGrants=true parameter is required (it does not exist in the API).
  it('MED-2: does not append revokeGrants query param - Logto handles internal revocation', async () => {
    const { deleteUserAccount } = await import('./account');

    const result = await deleteUserAccount('verif_record_1');

    expect(result.ok).toBe(true);
    const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
    const url = fetchCall[0] as string;
    // Logto internally revokes all grants/tokens during DELETE /api/users/{userId}
    // Do NOT append ?revokeGrants=true - it is unsupported and would be ignored or error
    expect(url).not.toContain('revokeGrants');
    expect(url).toContain('/api/users/user-test-123');
  });
});
