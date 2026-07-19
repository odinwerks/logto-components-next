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

vi.mock('./verification-cookie', () => ({
  requireVerifiedIdentity: vi.fn().mockResolvedValue(undefined),
  sealVerificationCookie: vi.fn().mockResolvedValue(undefined),
  clearVerificationCookie: vi.fn().mockResolvedValue(undefined),
}));

// Mock distributed-state with in-memory implementations.
// State maps are stored on globalThis so they survive vi.mock hoisting
// and can be cleared in afterEach for test isolation.
vi.mock('../../../lib/distributed-state', () => {
  // Use globalThis to hold state so it's accessible for cleanup in afterEach
  // (vi.mock factories are hoisted above variable declarations)
  type RLEntry = { count: number; resetAt: number };
  type LockNs = Map<string, Promise<void>>;

  if (!(globalThis as Record<string, unknown>).__mfa_test_rl_state) {
    (globalThis as Record<string, unknown>).__mfa_test_rl_state = new Map<string, RLEntry>();
  }
  if (!(globalThis as Record<string, unknown>).__mfa_test_lock_state) {
    (globalThis as Record<string, unknown>).__mfa_test_lock_state = new Map<string, LockNs>();
  }

  const rateLimitState = (globalThis as Record<string, unknown>).__mfa_test_rl_state as Map<string, RLEntry>;
  const lockState = (globalThis as Record<string, unknown>).__mfa_test_lock_state as Map<string, LockNs>;

  function createRateLimiter(options: { name: string; windowMs: number; max: number }) {
    const { name, windowMs, max } = options;
    return {
      check(key: string): boolean {
        const mapKey = `${name}:${key}`;
        const now = Date.now();
        const entry = rateLimitState.get(mapKey);
        if (!entry || now > entry.resetAt) {
          rateLimitState.set(mapKey, { count: 1, resetAt: now + windowMs });
          return true;
        }
        if (entry.count >= max) return false;
        entry.count++;
        return true;
      },
      reset(key: string): void {
        rateLimitState.delete(`${name}:${key}`);
      },
    };
  }

  function createLockManager(name: string) {
    if (!lockState.has(name)) {
      lockState.set(name, new Map());
    }

    return {
      async acquire(key: string): Promise<() => void> {
        const ns = lockState.get(name)!;
        while (true) {
          const existing = ns.get(key);
          if (!existing) break;
          await existing.catch(() => {});
        }
        let release!: () => void;
        const promise = new Promise<void>(resolve => { release = resolve; });
        ns.set(key, promise);
        return () => { ns.delete(key); release(); };
      },
      release(key: string): void {
        const ns = lockState.get(name);
        if (ns) ns.delete(key);
      },
    };
  }

  return { createRateLimiter, createLockManager };
});

// ============================================================================
// Imports of mocked modules
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { introspectToken } from '../utils';
import { requireVerifiedIdentity } from './verification-cookie';

// ============================================================================
// Imports under test
// ============================================================================

import {
  addMfaVerification,
  deleteMfaVerification,
  generateBackupCodes,
  getBackupCodes,
  replaceTotpVerification,
  generateTotpSecret,
} from './mfa';

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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  afterEach(() => {
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('accepts a valid Totp payload', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId,
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
      validIdentityVrecId,
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
      validIdentityVrecId,
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
      validIdentityVrecId,
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
      validIdentityVrecId,
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
      validIdentityVrecId,
    );
    expect(r.ok).toBe(true);
  });

  it('accepts a Totp payload with secret exactly 64 characters', async () => {
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'a'.repeat(64) },
      },
      validIdentityVrecId,
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
      validIdentityVrecId,
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
      validIdentityVrecId,
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
      validIdentityVrecId,
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
      validIdentityVrecId,
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

  it('rejects with UNAUTHENTICATED if token introspection is inactive', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: false });
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHENTICATED');
  });

  it('rejects with UNAUTHENTICATED if sub is missing in token introspection', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: true });
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHENTICATED');
  });
});

describe('generateBackupCodes', () => {
  const validIdentityVrecId = 'ivrec-def456';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('enrolls new backup codes before removing old factors so a failed enroll keeps old codes (BUG-L04)', async () => {
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([
        {
          id: 'backup-old-1',
          type: 'BackupCode',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString(),
        },
      ]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['A1', 'B2'] })) // generate
      .mockResolvedValueOnce(mockOkResponse())                         // enroll
      .mockResolvedValueOnce(mockOkResponse());                        // delete old

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('Expected success');
    expect(r.data.codes).toEqual(['A1', 'B2']);

    // BUG-L04: order is now list → generate → enroll → delete old
    // (previously list → delete old → generate → enroll).
    expect(makeRequest).toHaveBeenNthCalledWith(
      1,
      '/api/my-account/mfa-verifications',
      expect.objectContaining({
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
    expect(makeRequest).toHaveBeenNthCalledWith(
      2,
      '/api/my-account/mfa-verifications/backup-codes/generate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(makeRequest).toHaveBeenNthCalledWith(
      3,
      '/api/my-account/mfa-verifications',
      expect.objectContaining({
        method: 'POST',
        body: { type: 'BackupCode', codes: ['A1', 'B2'] },
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
    expect(makeRequest).toHaveBeenNthCalledWith(
      4,
      '/api/my-account/mfa-verifications/backup-old-1',
      expect.objectContaining({
        method: 'DELETE',
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
  });

  it('does NOT delete old backup codes when enrollment fails with a non-conflict error (BUG-L04)', async () => {
    // Make throwOnApiError behave like the real implementation: throw on
    // non-ok responses so the enroll failure actually propagates.
    vi.mocked(throwOnApiError).mockImplementation(async (res: Response) => {
      if (!res.ok) throw new Error('BACKUP_CODES_FAILED');
    });

    const failResponse = {
      status: 500,
      ok: false,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue('Internal Server Error'),
    } as unknown as Response;

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([
        {
          id: 'backup-old-1',
          type: 'BackupCode',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString(),
        },
      ]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['A1'] })) // generate
      .mockResolvedValueOnce(failResponse);                     // enroll → 500

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected error');
    expect(r.error).toBe('BACKUP_CODES_FAILED');
    // Crucially: only 3 calls (list, generate, enroll). The old backup factor
    // was NEVER deleted, so the user keeps their existing backup codes.
    expect(makeRequest).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(makeRequest).mock.calls as unknown as [string, { method?: string }][];
    const deleteCalled = calls.some(
      ([url, opts]) => url.includes('backup-old-1') && opts?.method === 'DELETE'
    );
    expect(deleteCalled).toBe(false);
  });

  it('deletes old factors and retries enrollment when Logto rejects concurrent BackupCode factors (409)', async () => {
    const conflictResponse = {
      status: 409,
      ok: false,
      json: vi.fn().mockResolvedValue({ code: 'backup_code.exists' }),
      text: vi.fn().mockResolvedValue('Conflict'),
    } as unknown as Response;

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([
        {
          id: 'backup-old-1',
          type: 'BackupCode',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString(),
        },
      ]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['A1'] })) // generate
      .mockResolvedValueOnce(conflictResponse)                  // enroll (1st) → 409
      .mockResolvedValueOnce(mockOkResponse())                  // delete old
      .mockResolvedValueOnce(mockOkResponse());                 // enroll (retry) → ok

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('Expected success');
    expect(r.data.codes).toEqual(['A1']);
    expect(makeRequest).toHaveBeenCalledTimes(5);
    // The retry enroll re-sends the same body after deleting the old factor.
    expect(makeRequest).toHaveBeenNthCalledWith(
      5,
      '/api/my-account/mfa-verifications',
      expect.objectContaining({
        method: 'POST',
        body: { type: 'BackupCode', codes: ['A1'] },
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
  });

  it('still generates and enrolls when no existing backup factors are present', async () => {
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['C3'] }))
      .mockResolvedValueOnce(mockOkResponse());

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('Expected success');
    expect(r.data.codes).toEqual(['C3']);
    expect(makeRequest).toHaveBeenCalledTimes(3);
  });

  it('serializes concurrent backup-code generation for the same user', async () => {
    // This test verifies the lock manager prevents concurrent calls from the same user
    let firstCallStarted = false;
    let secondCallStarted = false;
    let resolveFirst!: () => void;
    const firstCallBlock = new Promise<void>(r => { resolveFirst = r; });

    vi.mocked(makeRequest)
      // First call's list request - blocks
      .mockImplementationOnce(async () => {
        firstCallStarted = true;
        await firstCallBlock;
        return mockOkResponse([]);
      })
      // First call's generate request
      .mockResolvedValueOnce(mockOkResponse({ codes: ['X1'] }))
      // First call's enroll request
      .mockResolvedValueOnce(mockOkResponse())
      // Second call's list request - starts only after first finishes
      .mockImplementationOnce(async () => {
        secondCallStarted = true;
        return mockOkResponse([]);
      })
      // Second call's generate request
      .mockResolvedValueOnce(mockOkResponse({ codes: ['X2'] }))
      // Second call's enroll request
      .mockResolvedValueOnce(mockOkResponse());

    const promise1 = generateBackupCodes(validIdentityVrecId);
    const promise2 = generateBackupCodes(validIdentityVrecId);

    // Wait for first call to start
    await new Promise(r => setTimeout(r, 10));
    expect(firstCallStarted).toBe(true);
    // Second call should not have started (serialized by lock)
    expect(secondCallStarted).toBe(false);

    // Unblock first call
    resolveFirst();
    const [r1, r2] = await Promise.all([promise1, promise2]);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Now second call should have completed
    expect(secondCallStarted).toBe(true);
  });
});

describe('identity verification enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  it('requires verified identity for addMfaVerification', async () => {
    const result = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      'ivrec-def456',
    );

    expect(result.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(requireVerifiedIdentity).toHaveBeenCalledWith('ivrec-def456');
  });

  it('requires verified identity for deleteMfaVerification', async () => {
    const result = await deleteMfaVerification('mfa-def789', 'ivrec-def456');

    expect(result.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(requireVerifiedIdentity).toHaveBeenCalledWith('ivrec-def456');
  });

  it('requires verified identity for getBackupCodes', async () => {
    vi.mocked(makeRequest).mockResolvedValueOnce(
      mockOkResponse({ codes: [{ code: 'A1', usedAt: null }] }),
    );

    const result = await getBackupCodes('ivrec-def456');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data.codes).toHaveLength(1);
    expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(requireVerifiedIdentity).toHaveBeenCalledWith('ivrec-def456');
  });

  it('requires verified identity for replaceTotpVerification', async () => {
    const result = await replaceTotpVerification('JBSWY3DPEHPK3PXP', '123456', 'ivrec-def456');

    expect(result.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(requireVerifiedIdentity).toHaveBeenCalledWith('ivrec-def456');
  });

  it('rejects with VERIFICATION_EXPIRED when requireVerifiedIdentity rejects', async () => {
    const expiredErr = Object.assign(new Error('VERIFICATION_EXPIRED'), { name: 'SanitizedError' });
    vi.mocked(requireVerifiedIdentity).mockRejectedValueOnce(expiredErr);

    const result = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      'ivrec-def456',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('VERIFICATION_EXPIRED');
    }
    expect(makeRequest).not.toHaveBeenCalled();
  });
});

describe('generateTotpSecret rate limiting', () => {
  const baseTime = 1700000000000; // Fixed timestamp

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse({ secret: 'new-secret-abc' }));
    vi.spyOn(Date, 'now').mockReturnValue(baseTime);
    // Clear rate limit state for test isolation
    const rlState = (globalThis as Record<string, unknown>).__mfa_test_rl_state as Map<string, unknown> | undefined;
    rlState?.clear();
  });

  afterEach(() => {
    // Only restore Date.now spy — NOT all mocks.
    // vi.restoreAllMocks() would reset module-level mocks like introspectToken
    // and break downstream tests relying on their default implementations.
    const dateNowMock = vi.mocked(Date.now);
    // vitest spy: mockRestore restores original; for vi.fn, mockReset clears impl
    if (typeof dateNowMock.mockRestore === 'function') {
      dateNowMock.mockRestore();
    }
    // Restore introspectToken to default (auth rejection tests override it)
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    // Clear rate limit state after test
    const rlState = (globalThis as Record<string, unknown>).__mfa_test_rl_state as Map<string, unknown> | undefined;
    rlState?.clear();
  });

  it('allows the first request and enforces 10s cooldown for consecutive requests', async () => {
    // First request should succeed
    const res1 = await generateTotpSecret();
    expect(res1.ok).toBe(true);
    if (!res1.ok) throw new Error('Expected success');
    expect(res1.data).toEqual({ secret: 'new-secret-abc' });

    // A consecutive request within 10s (e.g. 5s later) should fail with MFA_ENROLL_FAILED
    vi.mocked(Date.now).mockReturnValue(baseTime + 5000);
    const res2 = await generateTotpSecret();
    expect(res2.ok).toBe(false);
    if (res2.ok) throw new Error('Expected failure');
    expect(res2.error).toContain('MFA_ENROLL_FAILED');

    // A request just after 10s should succeed (window expired)
    vi.mocked(Date.now).mockReturnValue(baseTime + 10001);
    const res3 = await generateTotpSecret();
    expect(res3.ok).toBe(true);
  });

  // ── M5: live auth rejection tests for generateTotpSecret ────────────────
  it('rejects with UNAUTHENTICATED when introspectToken returns active: false', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: false });
    const r = await generateTotpSecret();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHENTICATED');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects with UNAUTHENTICATED when introspectToken returns no sub', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: true });
    const r = await generateTotpSecret();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHENTICATED');
    expect(makeRequest).not.toHaveBeenCalled();
  });
});

describe('deleteMfaVerification authorized pattern', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  afterEach(() => {
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('successfully deletes verification', async () => {
    const r = await deleteMfaVerification('v-123', 'vrec-123');
    expect(r.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications/v-123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('rejects with UNAUTHENTICATED if token is inactive or missing sub', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: false });
    const r = await deleteMfaVerification('v-123', 'vrec-123');
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHENTICATED');
  });
});

describe('replaceTotpVerification authorized pattern', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  afterEach(() => {
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('successfully replaces totp', async () => {
    const r = await replaceTotpVerification('sec', '123456', 'vrec-123');
    expect(r.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications/totp',
      expect.objectContaining({
        method: 'PUT',
        body: { secret: 'sec', code: '123456' },
      }),
    );
  });

  it('rejects with UNAUTHENTICATED if token is inactive or missing sub', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: false });
    const r = await replaceTotpVerification('sec', '123456', 'vrec-123');
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHENTICATED');
  });

  it('rejects if secret or code are invalid', async () => {
    // Test invalid secret: length 0
    const r1 = await replaceTotpVerification('', '123456', 'vrec-123');
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toContain('INVALID_INPUT');

    // Test invalid secret: length > 64
    const r2 = await replaceTotpVerification('a'.repeat(65), '123456', 'vrec-123');
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toContain('INVALID_INPUT');

    // Test invalid code: not 6 digits
    const r3 = await replaceTotpVerification('sec', '12345', 'vrec-123');
    expect(r3.ok).toBe(false);
    if (!r3.ok) expect(r3.error).toContain('INVALID_INPUT');

    // Test invalid code: non-digits
    const r4 = await replaceTotpVerification('sec', '12345a', 'vrec-123');
    expect(r4.ok).toBe(false);
    if (!r4.ok) expect(r4.error).toContain('INVALID_INPUT');
  });
});
