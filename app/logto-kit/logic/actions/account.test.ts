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

import { makeRequest } from './request';
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
  });

  // ── Backward compat: no timestamp provided ──────────────────────────────

  it('proceeds when no verificationRecordTimestamp is provided (backward compat)', async () => {
    const { deleteUserAccount } = await import('./account');

    const result = await deleteUserAccount('verif_record_1');

    expect(result.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  // ── Exactly at the 10-minute boundary ───────────────────────────────────

  it('allows a verification record that has not yet expired', async () => {
    const { deleteUserAccount } = await import('./account');
    // verificationTimestamp is now expiresAt. Any future timestamp is valid.
    const boundaryTs = Date.now() + 100; // expires 100ms from now → still valid

    const result = await deleteUserAccount('verif_record_1', boundaryTs);

    expect(result.ok).toBe(true);
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
    const result = await deleteUserAccount('verif_record_1');

    expect(result.ok).toBe(true);
    
    expect(mockCookiesSet).toHaveBeenCalledTimes(3);
    expect(mockCookiesSet).toHaveBeenCalledWith('logto_session', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).toHaveBeenCalledWith('logto_active', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).toHaveBeenCalledWith('logto-active-org', '', { maxAge: 0, path: '/' });
    expect(mockCookiesSet).not.toHaveBeenCalledWith('other_cookie', expect.anything(), expect.anything());
  });
});
