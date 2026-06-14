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
import { getTokenForServerAction } from './tokens';

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

  afterEach(() => {
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
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

  it('rejects with UNAUTHORIZED if token introspection is inactive', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: false });
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHORIZED');
  });

  it('rejects with UNAUTHORIZED if sub is missing in token introspection', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: true });
    const r = await addMfaVerification(
      {
        type: 'Totp',
        payload: { code: '123456', secret: 'JBSWY3DPEHPK3PXP' },
      },
      validIdentityVrecId, validTimestamp,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHORIZED');
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

  it('serializes concurrent backup-code generation for the same user', async () => {
    // This test verifies the lock manager prevents concurrent calls from the same user
    const { getLogtoContext } = await import('@logto/next/server-actions');
    vi.mocked(getLogtoContext).mockResolvedValue({
      claims: { sub: 'same-user-lock-test' },
      isAuthenticated: true,
    } as unknown as Awaited<ReturnType<typeof getLogtoContext>>);

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

    const promise1 = generateBackupCodes(validIdentityVrecId, Date.now() + 600000);
    const promise2 = generateBackupCodes(validIdentityVrecId, Date.now() + 600000);

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
    // Clear rate limit state for test isolation
    const rlState = (globalThis as Record<string, unknown>).__mfa_test_rl_state as Map<string, unknown> | undefined;
    rlState?.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 5000);
    const res2 = await generateTotpSecret();
    expect(res2.ok).toBe(false);
    if (res2.ok) throw new Error('Expected failure');
    expect(res2.error).toContain('MFA_ENROLL_FAILED');

    // A request just after 10s should succeed (window expired)
    vi.spyOn(Date, 'now').mockReturnValue(baseTime + 10001);
    const res3 = await generateTotpSecret();
    expect(res3.ok).toBe(true);
  });
});

describe('deleteMfaVerification authorized pattern', () => {
  const validTimestamp = Date.now() + 600000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  afterEach(() => {
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('successfully deletes verification', async () => {
    const r = await deleteMfaVerification('v-123', 'vrec-123', validTimestamp);
    expect(r.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications/v-123',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('rejects with UNAUTHORIZED if token is inactive or missing sub', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: false });
    const r = await deleteMfaVerification('v-123', 'vrec-123', validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHORIZED');
  });
});

describe('replaceTotpVerification authorized pattern', () => {
  const validTimestamp = Date.now() + 600000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  afterEach(() => {
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
  });

  it('successfully replaces totp', async () => {
    const r = await replaceTotpVerification('sec', '123456', 'vrec-123', validTimestamp);
    expect(r.ok).toBe(true);
    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications/totp',
      expect.objectContaining({
        method: 'PUT',
        body: { secret: 'sec', code: '123456' },
      }),
    );
  });

  it('rejects with UNAUTHORIZED if token is inactive or missing sub', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: false });
    const r = await replaceTotpVerification('sec', '123456', 'vrec-123', validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('UNAUTHORIZED');
  });
});
