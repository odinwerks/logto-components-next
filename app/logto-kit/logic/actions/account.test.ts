import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module Mocks — hoisted above all imports
// ============================================================================

vi.mock('../../../logto', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-m2m-token'),
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
import { getManagementApiToken } from '../../../logto';

// ============================================================================
// deleteUserAccount — freshness check + account deletion
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

  it('rejects a verification record older than 10 minutes', async () => {
    const { deleteUserAccount } = await import('./account');
    const expiredTs = Date.now() - 11 * 60 * 1000; // 11 minutes ago

    const result = await deleteUserAccount('verif_record_1', expiredTs);

    expect(result.ok).toBe(false);
    // The deletion fetch should never have been called
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // ── Freshness check: valid timestamp ────────────────────────────────────

  it('allows a verification record within the 10-minute window', async () => {
    const { deleteUserAccount } = await import('./account');
    const freshTs = Date.now() - 1 * 60 * 1000; // 1 minute ago

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

  it('allows a verification record exactly 10 minutes old', async () => {
    const { deleteUserAccount } = await import('./account');
    const boundaryTs = Date.now() - 10 * 60 * 1000; // exactly 10 minutes ago

    const result = await deleteUserAccount('verif_record_1', boundaryTs);

    expect(result.ok).toBe(true);
  });

  // ── Negative timestamp (future) — should always be within window ────────

  it('allows a verification record with a future timestamp', async () => {
    const { deleteUserAccount } = await import('./account');
    const futureTs = Date.now() + 60 * 1000; // 1 minute in the future

    const result = await deleteUserAccount('verif_record_1', futureTs);

    expect(result.ok).toBe(true);
  });
});
