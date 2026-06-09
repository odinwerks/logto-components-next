import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

vi.mock('../audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../guards')>();
  return {
    ...actual,
    assertMfaType: actual.assertMfaType,
    assertSafeLogtoId: actual.assertSafeLogtoId,
  };
});

vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn().mockResolvedValue({
    claims: { sub: 'user-test-123' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../config', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({
    endpoint: 'https://logto.example.com',
  }),
}));

// ============================================================================
// Imports of mocked modules
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';

// ============================================================================
// Imports under test
// ============================================================================

import {
  addMfaVerification,
  deleteMfaVerification,
  generateBackupCodes,
  getBackupCodes,
  replaceTotpVerification,
  getBackupCodesLocksSizeForTesting,
  clearBackupCodesLocksForTesting,
  setBackupCodesLockForTesting,
  hasBackupCodesLockForTesting,
  generateTotpSecret,
  clearTotpCooldownsForTesting,
  getTotpCooldownsSizeForTesting,
  setTotpCooldownForTesting,
  hasTotpCooldownForTesting,
} from './mfa';
import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS } from '../constants';

// ============================================================================
// Helpers
// ============================================================================

const mockOkResponse = (data?: unknown): Response =>
  ({
    status: 200,
    ok: true,
    json: vi.fn().mockResolvedValue(data ?? {}),
    text: vi.fn().mockResolvedValue(''),
  } as unknown as Response);

// ============================================================================
// addMfaVerification - payload validation
// ============================================================================

describe('addMfaVerification', () => {
  const validIdentityVrecId = 'ivrec-def456';
  const validTimestamp = Date.now() + 600000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  it('accepts a valid Totp payload', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(true);

    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications',
      expect.objectContaining({
        method: 'POST',
        body: { type: 'Totp', code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
  });

  it('rejects a Totp payload with overly long code (> 16)', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '1'.repeat(17), secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects a Totp payload with overly long secret (> 64)', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'a'.repeat(65) },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects a Totp payload with non-string code', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp' as const,
        payload: { code: 123456 as unknown as string, secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects a Totp payload with non-string secret', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp' as const,
        payload: { code: '123456', secret: 12345 as unknown as string },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('accepts a Totp payload with code exactly 16 characters', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: 'a'.repeat(16), secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(true);
  });

  it('accepts a Totp payload with secret exactly 64 characters', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'a'.repeat(64) },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects payload with overly long newIdentifierVerificationRecordId (> 128)', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'r'.repeat(129),
        },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('accepts payload with a valid string newIdentifierVerificationRecordId', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
        },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(true);

    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications',
      expect.objectContaining({
        body: expect.objectContaining({
          newIdentifierVerificationRecordId: 'vrec-abc123',
        }),
      }),
    );
  });

  // BUG-017: MFA payload spreads unknown fields
  it('does NOT spread unknown payload fields for Totp type', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' } as unknown as { code: string; secret: string; __proto__?: object; constructor?: object },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(true);

    const callBody = vi.mocked(makeRequest).mock.calls[0]?.[1]?.body as Record<string, unknown>;
    // Should only have type, code, secret - no prototype pollution vectors
    expect(Object.keys(callBody).sort()).toEqual(['code', 'secret', 'type']);
  });

  it('does NOT spread unknown payload fields for WebAuthn type', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          unknownField: 'should-not-be-forwarded',
          anotherGarbage: 42,
        },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(true);

    const callBody = vi.mocked(makeRequest).mock.calls[0]?.[1]?.body as Record<string, unknown>;
    // unknownField and anotherGarbage must NOT appear in the body
    expect(callBody).not.toHaveProperty('unknownField');
    expect(callBody).not.toHaveProperty('anotherGarbage');
    // Only known WebAuthn fields should be present
    expect(callBody).toHaveProperty('type', 'WebAuthn');
    expect(callBody).toHaveProperty('newIdentifierVerificationRecordId', 'vrec-abc123');
  });
});

describe('generateBackupCodes', () => {
  const validIdentityVrecId = 'ivrec-def456';
  const validTimestamp = Date.now() + 600000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('removes existing backup-code factors before generating and enrolling new codes', async () => {
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([
        {
          id: 'backup-old-1',
          type: 'BackupCode',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString(),
        },
      ]))
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse({ codes: ['A1', 'B2'] }))
      .mockResolvedValueOnce(mockOkResponse());

    const r = await generateBackupCodes(validIdentityVrecId, validTimestamp);

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('Expected success');
    expect(r.data.codes).toEqual(['A1', 'B2']);

    expect(makeRequest).toHaveBeenNthCalledWith(
      1,
      '/api/my-account/mfa-verifications',
      expect.objectContaining({
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
    expect(makeRequest).toHaveBeenNthCalledWith(
      2,
      '/api/my-account/mfa-verifications/backup-old-1',
      expect.objectContaining({
        method: 'DELETE',
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
    expect(makeRequest).toHaveBeenNthCalledWith(
      3,
      '/api/my-account/mfa-verifications/backup-codes/generate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(makeRequest).toHaveBeenNthCalledWith(
      4,
      '/api/my-account/mfa-verifications',
      expect.objectContaining({
        method: 'POST',
        body: { type: 'BackupCode', codes: ['A1', 'B2'] },
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
  });

  it('still generates and enrolls when no existing backup factors are present', async () => {
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['C3'] }))
      .mockResolvedValueOnce(mockOkResponse());

    const r = await generateBackupCodes(validIdentityVrecId, validTimestamp);

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('Expected success');
    expect(r.data.codes).toEqual(['C3']);
    expect(makeRequest).toHaveBeenCalledTimes(3);
  });

  it('evicts only the oldest entry and preserves active in-flight locks when lock map exceeds MAX_LOCK_ENTRIES', async () => {
    await clearBackupCodesLocksForTesting();

    // Add oldest entry
    await setBackupCodesLockForTesting('user-oldest', Promise.resolve());

    // Add 998 intermediate entries
    for (let i = 1; i <= 998; i++) {
      await setBackupCodesLockForTesting(`user-${i}`, Promise.resolve());
    }

    // Add active lock (999th entry)
    const activePromise = new Promise<void>(() => {});
    await setBackupCodesLockForTesting('user-active', activePromise);

    // Total size is now 1000
    expect(await getBackupCodesLocksSizeForTesting()).toBe(1000);

    // Mock makeRequest to return standard responses
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['C3'] }))
      .mockResolvedValueOnce(mockOkResponse());

    // Mock the user ID for this request to be 'user-new'
    const { getLogtoContext } = await import('@logto/next/server-actions');
    vi.mocked(getLogtoContext).mockResolvedValueOnce({
      claims: { sub: 'user-new' },
      isAuthenticated: true,
    } as unknown as Awaited<ReturnType<typeof getLogtoContext>>);

    const r = await generateBackupCodes(validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(true);

    // Verify oldest is evicted
    expect(await hasBackupCodesLockForTesting('user-oldest')).toBe(false);

    // Verify active is kept
    expect(await hasBackupCodesLockForTesting('user-active')).toBe(true);

    // Verify 'user-new' is deleted at the end of the request
    expect(await hasBackupCodesLockForTesting('user-new')).toBe(false);

    // Verify final map size is 999
    expect(await getBackupCodesLocksSizeForTesting()).toBe(999);
  });
});

describe('verification clock skew tolerance', () => {
  const now = new Date('2026-01-01T00:00:00.000Z').getTime();
  const validWithinToleranceTimestamp = now - VERIFICATION_CLOCK_SKEW_TOLERANCE_MS + 1;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows addMfaVerification within skew tolerance', async () => {
    vi.mocked(makeRequest).mockResolvedValueOnce(mockOkResponse());

    const result = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      'ivrec-def456',
      validWithinToleranceTimestamp,
    );

    expect(result.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it('allows deleteMfaVerification within skew tolerance', async () => {
    vi.mocked(makeRequest).mockResolvedValueOnce(mockOkResponse());

    const result = await deleteMfaVerification(
      'mfa-def789',
      'ivrec-def456',
      validWithinToleranceTimestamp,
    );

    expect(result.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it('allows getBackupCodes within skew tolerance', async () => {
    vi.mocked(makeRequest).mockResolvedValueOnce(
      mockOkResponse({ codes: [{ code: 'A1', usedAt: null }] }),
    );

    const result = await getBackupCodes('ivrec-def456', validWithinToleranceTimestamp);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data.codes).toHaveLength(1);
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it('allows replaceTotpVerification within skew tolerance', async () => {
    vi.mocked(makeRequest).mockResolvedValueOnce(mockOkResponse());

    const result = await replaceTotpVerification(
      'JBSWY3DPEHPK3PXP',
      '123456',
      'ivrec-def456',
      validWithinToleranceTimestamp,
    );

    expect(result.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });
});

describe('generateTotpSecret rate limiting', () => {
  const baseTime = 1700000000000; // Fixed timestamp

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse({ secret: 'new-secret-abc' }));
    vi.spyOn(Date, 'now').mockReturnValue(baseTime);
  });

  afterEach(async () => {
    await clearTotpCooldownsForTesting();
    vi.restoreAllMocks();
  });

  it('allows the first request and enforces 10s cooldown for consecutive requests', async () => {
    // First request should succeed
    const res1 = await generateTotpSecret();
    expect(res1.ok).toBe(true);
    if (!res1.ok) throw new Error('Expected success');
    expect(res1.data).toEqual({ secret: 'new-secret-abc' });

    // A consecutive request within 10s (e.g. 5s later) should fail with MFA_ENROLL_FAILED
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 5000);
    const res2 = await generateTotpSecret();
    expect(res2.ok).toBe(false);
    if (res2.ok) throw new Error('Expected failure');
    expect(res2.error).toContain('MFA_ENROLL_FAILED');

    // A request 10s later should succeed
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 10000);
    const res3 = await generateTotpSecret();
    expect(res3.ok).toBe(true);
  });

  it('performs memory-safe pruning of expired and non-expired entries in cooldown map', async () => {
    await clearTotpCooldownsForTesting();

    // Populate with 1000 expired entries
    for (let i = 1; i <= 1000; i++) {
      // Cooldown set to baseTime - 15000 (expired 15s ago relative to baseTime)
      await setTotpCooldownForTesting(`user-${i}`, baseTime - 15000);
    }
    
    expect(await getTotpCooldownsSizeForTesting()).toBe(1000);

    // Call generateTotpSecret. Since size is >= 1000, it should execute lazy-on-write cleanup.
    // Since all 1000 entries are expired, they should be completely deleted, and only the current user's cooldown is added.
    const res = await generateTotpSecret();
    expect(res.ok).toBe(true);

    // The map size should now be 1 (only the current user's entry)
    expect(await getTotpCooldownsSizeForTesting()).toBe(1);
    expect(await hasTotpCooldownForTesting('user-test-123')).toBe(true);
  });

  it('clears the map completely if it exceeds 1000 entries and none are expired', async () => {
    await clearTotpCooldownsForTesting();

    // Populate with 1000 active (non-expired) entries
    for (let i = 1; i <= 1000; i++) {
      await setTotpCooldownForTesting(`user-${i}`, baseTime - 5000);
    }

    expect(await getTotpCooldownsSizeForTesting()).toBe(1000);

    // Call generateTotpSecret. It should trigger lazy cleanup.
    // Since none are expired, the map is still full, so it should clear the Map.
    // Then it adds the current user's entry.
    const res = await generateTotpSecret();
    expect(res.ok).toBe(true);

    // Map size should be 1 (only the current user)
    expect(await getTotpCooldownsSizeForTesting()).toBe(1);
    expect(await hasTotpCooldownForTesting('user-test-123')).toBe(true);
  });
});
