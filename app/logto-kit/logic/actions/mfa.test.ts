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

vi.mock('../log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../log')>();
  return {
    ...actual,
    warn: vi.fn(),
  };
});

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
  type LockEntry = {
    promise: Promise<void>;
    release: () => void;
    leaseTimer: ReturnType<typeof setTimeout>;
  };
  type LockNs = Map<string, LockEntry>;

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
      async check(key: string): Promise<boolean> {
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
      async reset(key: string): Promise<void> {
        rateLimitState.delete(`${name}:${key}`);
      },
    };
  }

  function createLockManager(name: string, options: { leaseDurationMs?: number } = {}) {
    const leaseDurationMs = options.leaseDurationMs ?? 30_000;
    if (!lockState.has(name)) {
      lockState.set(name, new Map());
    }

    return {
      async acquire(key: string): Promise<() => void> {
        const ns = lockState.get(name)!;
        while (true) {
          const existing = ns.get(key);
          if (!existing) break;
          await existing.promise.catch(() => {});
        }
        let release!: () => void;
        const promise = new Promise<void>(resolve => { release = resolve; });
        const entry: LockEntry = {
          promise,
          release,
          leaseTimer: setTimeout(() => {
            if (ns.get(key) === entry) {
              ns.delete(key);
              release();
            }
          }, leaseDurationMs),
        };
        ns.set(key, entry);
        return () => {
          if (ns.get(key) === entry) ns.delete(key);
          clearTimeout(entry.leaseTimer);
          release();
        };
      },
      release(key: string): void {
        const ns = lockState.get(name);
        const entry = ns?.get(key);
        if (entry) {
          ns!.delete(key);
          clearTimeout(entry.leaseTimer);
          entry.release();
        }
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
import { audit } from '../audit';
import { warn } from '../log';

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

const installFakeAbortSignalTimeout = () =>
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((delayMs: number) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException('The operation timed out', 'TimeoutError')),
      delayMs,
    );
    return controller.signal;
  });

const waitForAbort = (
  signal: AbortSignal | undefined,
  onAbort?: () => void,
): Promise<Response> => {
  if (!signal) throw new Error('Expected an explicit request signal');
  return new Promise<Response>((_resolve, reject) => {
    const rejectForAbort = () => {
      onAbort?.();
      reject(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
    };
    if (signal.aborted) {
      rejectForAbort();
      return;
    }
    signal.addEventListener('abort', rejectForAbort, { once: true });
  });
};

const resolveBeforeAbort = (
  signal: AbortSignal | undefined,
  delayMs: number,
  response: Response,
): Promise<Response> => {
  if (!signal) throw new Error('Expected an explicit request signal');
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', rejectForAbort);
      resolve(response);
    }, delayMs);
    const rejectForAbort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
    };
    signal.addEventListener('abort', rejectForAbort, { once: true });
  });
};

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

  // ── BUG-055: BackupCode codes validation ──────────────────────────────
  it('accepts a BackupCode payload with valid codes', async () => {
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes: ['A1B2C3D4', 'E5F6G7H8'] },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(true);

    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications',
      expect.objectContaining({
        method: 'POST',
        body: { type: 'BackupCode', codes: ['A1B2C3D4', 'E5F6G7H8'] },
        extraHeaders: { 'logto-verification-id': validIdentityVrecId },
      }),
    );
  });

  it('rejects BackupCode payload with codes that are not an array', async () => {
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes: 'not-an-array' as unknown as string[] },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects BackupCode payload with empty codes array', async () => {
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes: [] },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects BackupCode payload with codes array exceeding max length (>20)', async () => {
    const tooManyCodes = Array.from({ length: 21 }, (_, i) => `CODE${i}`);
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes: tooManyCodes },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects BackupCode payload with a code that is too short (< 4)', async () => {
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes: ['ABC'] },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects BackupCode payload with a code that is too long (> 50)', async () => {
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes: ['A'.repeat(51)] },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects BackupCode payload with a code containing non-alphanumeric characters', async () => {
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes: ['ABC-DEF'] },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('accepts BackupCode payload at boundary: 4-char codes and 50-char codes, 20 entries', async () => {
    const codes = Array.from({ length: 20 }, (_, i) => `C${String(i).padStart(3, '0')}`); // "C000" through "C019"
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(true);
  });

  it('accepts BackupCode payload at boundary: single 50-char code', async () => {
    const r = await addMfaVerification(
      {
        type: 'BackupCode',
        payload: { codes: ['A'.repeat(50)] },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(true);
  });

  // ── BUG-055: WebAuthn credential ID validation ────────────────────────
  it('accepts a WebAuthn payload with valid id and rawId', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          id: 'AdDdOWljMjk0ZmQ4ZGUzZTU2NmFiMjg4M2QxZDNmNDY',
          rawId: 'AdDdOWljMjk0ZmQ4ZGUzZTU2NmFiMjg4M2QxZDNmNDY',
        },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(true);

    const callBody = vi.mocked(makeRequest).mock.calls[0]?.[1]?.body as Record<string, unknown>;
    expect(callBody).toHaveProperty('id', 'AdDdOWljMjk0ZmQ4ZGUzZTU2NmFiMjg4M2QxZDNmNDY');
    expect(callBody).toHaveProperty('rawId', 'AdDdOWljMjk0ZmQ4ZGUzZTU2NmFiMjg4M2QxZDNmNDY');
  });

  it('rejects WebAuthn payload with id containing non-base64url characters', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          id: 'invalid/chars+here==',
        },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects WebAuthn payload with rawId containing non-base64url characters', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          rawId: 'bad+chars/here',
        },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects WebAuthn payload with id exceeding 512 characters', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          id: 'A'.repeat(513),
        },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects WebAuthn payload with rawId exceeding 512 characters', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          rawId: 'A'.repeat(513),
        },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects WebAuthn payload with empty id', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          id: '',
        },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('rejects WebAuthn payload with empty rawId', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          rawId: '',
        },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
    expect(makeRequest).not.toHaveBeenCalled();
  });

  it('accepts WebAuthn payload at boundary: 512-char base64url id', async () => {
    const r = await addMfaVerification(
      {
        type: 'WebAuthn',
        payload: {
          newIdentifierVerificationRecordId: 'vrec-abc123',
          id: 'A'.repeat(512),
        },
      },
      validIdentityVrecId,
    );
    expect(r.ok).toBe(true);
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
      .mockResolvedValueOnce(mockOkResponse())                         // delete old
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-new-1',
        type: 'BackupCode',
        createdAt: new Date('2024-02-01').toISOString(),
      }]));                                                            // final reconciliation

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

  it('M-007 audits and compensates a resolved 500 after enrollment committed server-side', async () => {
    vi.mocked(throwOnApiError).mockImplementation(async (res: Response) => {
      if (!res.ok) {
        const err = new Error('BACKUP_CODES_FAILED');
        err.name = 'SanitizedError';
        throw err;
      }
    });

    const oldFactor = {
      id: 'backup-old-1',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString(),
    };
    const committedFactor = { ...oldFactor, id: 'backup-committed-on-500' };
    let currentFactors = [oldFactor];
    let listCall = 0;
    const failResponse = {
      status: 500,
      ok: false,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue('Internal Server Error'),
    } as unknown as Response;

    vi.mocked(makeRequest).mockImplementation(async (path, options) => {
      if (path === '/api/my-account/mfa-verifications' && !options?.method) {
        listCall++;
        return mockOkResponse([...currentFactors]);
      }
      if (path.endsWith('/backup-codes/generate')) {
        return mockOkResponse({ codes: ['A1'] });
      }
      if (path === '/api/my-account/mfa-verifications' && options?.method === 'POST') {
        currentFactors = [oldFactor, committedFactor];
        return failResponse;
      }
      if (path.endsWith('/backup-committed-on-500') && options?.method === 'DELETE') {
        currentFactors = [oldFactor];
        return mockOkResponse();
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected error');
    expect(r.error).toBe('BACKUP_CODES_FAILED');
    expect(listCall).toBe(3);
    expect(currentFactors).toEqual([oldFactor]);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'mfa.backup_codes.rotation_ambiguous',
      metadata: expect.objectContaining({ stage: 'enroll', deadlineExceeded: false }),
    }));
    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications/backup-committed-on-500',
      expect.objectContaining({ method: 'DELETE', signal: expect.any(AbortSignal) }),
    );
    const calls = vi.mocked(makeRequest).mock.calls as unknown as [string, { method?: string }][];
    const oldFactorDeleteCalled = calls.some(
      ([url, opts]) => url.includes('backup-old-1') && opts?.method === 'DELETE'
    );
    expect(oldFactorDeleteCalled).toBe(false);
    expect(audit).not.toHaveBeenCalledWith(expect.objectContaining({
      action: 'mfa.backup_codes.generate',
    }));
  });

  // CAN-ACT-005: When an existing BackupCode factor causes a 409/422 singleton
  // rejection, a blind retry of the identical body CANNOT succeed (no
  // factor-state change). The fix skips the retry and fails safely with
  // BACKUP_CODES_SINGLETON_CONFLICT, retaining the user's old codes.
  it('fails safely with BACKUP_CODES_SINGLETON_CONFLICT on 409 when existing backup factors are present (CAN-ACT-005)', async () => {
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
      .mockResolvedValueOnce(conflictResponse);                  // enroll → 409

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toBe('BACKUP_CODES_SINGLETON_CONFLICT');

    // Only 3 calls: list, generate, enroll. NO blind retry.
    expect(makeRequest).toHaveBeenCalledTimes(3);

    // The old backup factor was NEVER deleted — old codes are preserved.
    const calls = vi.mocked(makeRequest).mock.calls as unknown as [string, { method?: string }][];
    const deleteCalled = calls.some(
      ([url, opts]) => url.includes('backup-old-1') && opts?.method === 'DELETE'
    );
    expect(deleteCalled).toBe(false);
  });

  it('fails safely with BACKUP_CODES_SINGLETON_CONFLICT on 422 when existing backup factors are present (CAN-ACT-005)', async () => {
    const conflictResponse = {
      status: 422,
      ok: false,
      json: vi.fn().mockResolvedValue({ code: 'backup_code.exists' }),
      text: vi.fn().mockResolvedValue('Unprocessable Entity'),
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
      .mockResolvedValueOnce(mockOkResponse({ codes: ['A1', 'B2'] })) // generate
      .mockResolvedValueOnce(conflictResponse);                       // enroll → 422

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toBe('BACKUP_CODES_SINGLETON_CONFLICT');

    // Only 3 calls: list, generate, enroll. NO blind retry.
    expect(makeRequest).toHaveBeenCalledTimes(3);

    // The old backup factor was NEVER deleted.
    const calls = vi.mocked(makeRequest).mock.calls as unknown as [string, { method?: string }][];
    const deleteCalled = calls.some(
      ([url, opts]) => url.includes('backup-old-1') && opts?.method === 'DELETE'
    );
    expect(deleteCalled).toBe(false);
  });

  it('falls through to BACKUP_CODES_FAILED (not singleton conflict) on 409 when NO existing backup factors are present', async () => {
    // Make throwOnApiError behave like the real implementation: throw on
    // non-ok responses so the enroll failure actually propagates.
    vi.mocked(throwOnApiError).mockImplementation(async (res: Response) => {
      if (!res.ok) {
        const err = new Error('BACKUP_CODES_FAILED');
        err.name = 'SanitizedError';
        throw err;
      }
    });

    const conflictResponse = {
      status: 409,
      ok: false,
      json: vi.fn().mockResolvedValue({ code: 'backup_code.exists' }),
      text: vi.fn().mockResolvedValue('Conflict'),
    } as unknown as Response;

    // No existing backup factors — the 409 is NOT a singleton conflict.
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([]))               // list (empty)
      .mockResolvedValueOnce(mockOkResponse({ codes: ['A1'] })) // generate
      .mockResolvedValueOnce(conflictResponse);                 // enroll → 409

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    // Must NOT be the singleton conflict code — this is a genuine error path.
    expect(r.error).toBe('BACKUP_CODES_FAILED');
    expect(r.error).not.toBe('BACKUP_CODES_SINGLETON_CONFLICT');

    // Only 3 calls: list, generate, enroll. No retry.
    expect(makeRequest).toHaveBeenCalledTimes(3);
  });

  it('still generates and enrolls when no existing backup factors are present', async () => {
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['C3'] }))
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-new-1',
        type: 'BackupCode',
        createdAt: new Date('2024-02-01').toISOString(),
      }]));

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('Expected success');
    expect(r.data.codes).toEqual(['C3']);
    expect(makeRequest).toHaveBeenCalledTimes(4);
  });

  it('M-007 logs compensation cleanup failure and fails closed', async () => {
    // Simulate: list ok → generate ok → enroll ok → delete old throws, then
    // the bounded compensation attempt also throws. Neither failure may be
    // swallowed after enrollment has committed.
    vi.mocked(throwOnApiError).mockImplementation(async (res: Response, _code, _action) => {
      if (!res.ok) {
        const err = new Error('BACKUP_CODES_FAILED');
        err.name = 'SanitizedError';
        throw err;
      }
    });

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
      .mockResolvedValueOnce(mockOkResponse())                        // enroll (ok)
      .mockRejectedValueOnce(new Error('transient delete failure'))   // delete old → throws
      .mockRejectedValueOnce(new Error('compensation delete failure'))
      .mockRejectedValueOnce(new Error('final reconciliation unavailable'));

    const r = await generateBackupCodes(validIdentityVrecId);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected fail-closed error');
    expect(r.error).toBe('BACKUP_CODES_FAILED');
    expect(makeRequest).toHaveBeenCalledTimes(6);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      actor: 'user-test-123',
      action: 'mfa.backup_codes.rotation_ambiguous',
      metadata: expect.objectContaining({ stage: 'delete-old' }),
    }));
    expect(warn).toHaveBeenCalledWith(
      '[generateBackupCodes] Compensation cleanup failed:',
      expect.objectContaining({ message: 'compensation delete failure' }),
    );
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'mfa.backup_codes.rotation_divergence',
      metadata: expect.objectContaining({ stage: 'final-success' }),
    }));
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
      // First call's final reconciliation
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-new-first',
        type: 'BackupCode',
        createdAt: new Date('2024-02-01').toISOString(),
      }]))
      // Second call's list request - starts only after first finishes
      .mockImplementationOnce(async () => {
        secondCallStarted = true;
        return mockOkResponse([]);
      })
      // Second call's generate request
      .mockResolvedValueOnce(mockOkResponse({ codes: ['X2'] }))
      // Second call's enroll request
      .mockResolvedValueOnce(mockOkResponse())
      // Second call's final reconciliation
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-new-second',
        type: 'BackupCode',
        createdAt: new Date('2024-03-01').toISOString(),
      }]));

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

  it('holds the backup-code lock until successful old-factor cleanup finishes', async () => {
    let cleanupStarted = false;
    let secondRotationStarted = false;
    let resolveCleanup!: () => void;
    const cleanupBlock = new Promise<void>(resolve => { resolveCleanup = resolve; });

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([
        {
          id: 'backup-old-1',
          type: 'BackupCode',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString(),
        },
      ]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['FIRST'] }))
      .mockResolvedValueOnce(mockOkResponse())
      .mockImplementationOnce(async () => {
        cleanupStarted = true;
        await cleanupBlock;
        return mockOkResponse();
      })
      .mockImplementationOnce(async () => {
        return mockOkResponse([{
          id: 'backup-new-first',
          type: 'BackupCode',
          createdAt: new Date('2024-02-01').toISOString(),
        }]);
      })
      .mockImplementationOnce(async () => {
        secondRotationStarted = true;
        return mockOkResponse([]);
      })
      .mockResolvedValueOnce(mockOkResponse({ codes: ['SECOND'] }))
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-new-second',
        type: 'BackupCode',
        createdAt: new Date('2024-03-01').toISOString(),
      }]));

    const first = generateBackupCodes(validIdentityVrecId);
    await vi.waitFor(() => expect(cleanupStarted).toBe(true));

    const second = generateBackupCodes(validIdentityVrecId);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(secondRotationStarted).toBe(false);

    resolveCleanup();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    expect(secondRotationStarted).toBe(true);
  });

  it('M-007 lease covers a stalled-then-completing rotation', async () => {
    vi.useFakeTimers();
    const timeoutSpy = installFakeAbortSignalTimeout();
    let enrollmentStarted = false;
    let secondRotationStarted = false;

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['FIRST'] }))
      .mockImplementationOnce(async (_path, options) => {
        enrollmentStarted = true;
        return resolveBeforeAbort(options?.signal, 44_000, mockOkResponse());
      })
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-new-first',
        type: 'BackupCode',
        createdAt: new Date('2024-02-01').toISOString(),
      }]))
      .mockImplementationOnce(async () => {
        secondRotationStarted = true;
        return mockOkResponse([]);
      })
      .mockResolvedValueOnce(mockOkResponse({ codes: ['SECOND'] }))
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-new-second',
        type: 'BackupCode',
        createdAt: new Date('2024-03-01').toISOString(),
      }]));

    try {
      const first = generateBackupCodes(validIdentityVrecId);
      await vi.advanceTimersByTimeAsync(0);
      expect(enrollmentStarted).toBe(true);

      const second = generateBackupCodes(validIdentityVrecId);
      await vi.advanceTimersByTimeAsync(43_999);
      expect(secondRotationStarted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      const [firstResult, secondResult] = await Promise.all([first, second]);
      expect(firstResult.ok).toBe(true);
      expect(secondResult.ok).toBe(true);
      expect(secondRotationStarted).toBe(true);
      expect(timeoutSpy).toHaveBeenCalledWith(45_000);
    } finally {
      timeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('M-007 post-abort remote DELETE commit returns error and audits ambiguity', async () => {
    vi.useFakeTimers();
    const timeoutSpy = installFakeAbortSignalTimeout();
    let remoteDeleteCommitted = false;
    const alreadyDeleted = {
      status: 404,
      ok: false,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue('Not found'),
    } as unknown as Response;

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-old-1',
        type: 'BackupCode',
        createdAt: new Date('2024-01-01').toISOString(),
        updatedAt: new Date('2024-01-01').toISOString(),
      }]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['LATE'] }))
      .mockResolvedValueOnce(mockOkResponse())
      .mockImplementationOnce(async (_path, options) =>
        waitForAbort(options?.signal, () => { remoteDeleteCommitted = true; }))
      .mockImplementationOnce(async () => remoteDeleteCommitted ? alreadyDeleted : mockOkResponse());

    try {
      const pending = generateBackupCodes(validIdentityVrecId);
      await vi.advanceTimersByTimeAsync(60_000);
      const result = await pending;

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected fail-closed error');
      expect(result.error).toBe('BACKUP_CODES_FAILED');
      expect(remoteDeleteCommitted).toBe(true);
      expect(audit).toHaveBeenCalledWith(expect.objectContaining({
        actor: 'user-test-123',
        action: 'mfa.backup_codes.rotation_ambiguous',
        metadata: expect.objectContaining({
          stage: 'delete-old',
          deadlineExceeded: true,
        }),
      }));
      expect(vi.mocked(makeRequest).mock.calls[3]?.[1]?.signal).toBeInstanceOf(AbortSignal);
      expect(audit).not.toHaveBeenCalledWith(expect.objectContaining({
        action: 'mfa.backup_codes.generate',
      }));
    } finally {
      timeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('M-007 audits and compensates enrollment rejection ambiguity', async () => {
    vi.useFakeTimers();
    const timeoutSpy = installFakeAbortSignalTimeout();
    const oldFactor = {
      id: 'backup-old-1',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString(),
    };
    const committedFactor = { ...oldFactor, id: 'backup-ambiguous-new' };
    let remoteEnrollmentCommitted = false;

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([oldFactor]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['UNKNOWN'] }))
      .mockImplementationOnce(async (_path, options) =>
        waitForAbort(options?.signal, () => { remoteEnrollmentCommitted = true; }))
      .mockImplementationOnce(async () => mockOkResponse(
        remoteEnrollmentCommitted ? [oldFactor, committedFactor] : [oldFactor],
      ))
      .mockResolvedValueOnce(mockOkResponse());

    try {
      const pending = generateBackupCodes(validIdentityVrecId);
      await vi.advanceTimersByTimeAsync(60_000);
      const result = await pending;

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected fail-closed error');
      expect(result.error).toBe('BACKUP_CODES_FAILED');
      expect(audit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'mfa.backup_codes.rotation_ambiguous',
        metadata: expect.objectContaining({ stage: 'enroll', deadlineExceeded: true }),
      }));
      expect(makeRequest).toHaveBeenNthCalledWith(
        5,
        '/api/my-account/mfa-verifications/backup-ambiguous-new',
        expect.objectContaining({ method: 'DELETE', signal: expect.any(AbortSignal) }),
      );
      expect(vi.mocked(makeRequest).mock.calls.some(([path]) => path.endsWith('backup-old-1'))).toBe(false);
    } finally {
      timeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('M-007 keeps a rejected enrollment pending until ambiguous settlement', async () => {
    vi.useFakeTimers();
    const timeoutSpy = installFakeAbortSignalTimeout();
    const oldFactor = {
      id: 'backup-old-1',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString(),
    };
    const committedFactor = { ...oldFactor, id: 'backup-ambiguous-new' };
    let listCall = 0;
    let generateCall = 0;
    let compensationStarted = false;
    let resolveCompensation!: () => void;
    const compensationBlock = new Promise<void>(resolve => {
      resolveCompensation = resolve;
    });

    vi.mocked(makeRequest).mockImplementation(async (path, options) => {
      if (path === '/api/my-account/mfa-verifications' && !options?.method) {
        listCall++;
        if (listCall === 1) return mockOkResponse([oldFactor]);
        if (listCall === 2) {
          compensationStarted = true;
          await compensationBlock;
          return mockOkResponse([oldFactor, committedFactor]);
        }
        if (listCall === 3) return mockOkResponse([oldFactor]);
        return mockOkResponse([{
          id: 'backup-new-second',
          type: 'BackupCode',
          createdAt: new Date('2024-03-01').toISOString(),
        }]);
      }
      if (path.endsWith('/backup-codes/generate')) {
        generateCall++;
        return mockOkResponse({ codes: [generateCall === 1 ? 'FIRST' : 'SECOND'] });
      }
      if (path.endsWith('/backup-ambiguous-new')) return mockOkResponse();
      if (options?.method === 'POST' && (options.body as { codes?: string[] })?.codes?.[0] === 'FIRST') {
        return waitForAbort(options.signal);
      }
      return mockOkResponse();
    });

    try {
      const first = generateBackupCodes(validIdentityVrecId);
      let firstSettled = false;
      void first.then(() => { firstSettled = true; });
      await vi.advanceTimersByTimeAsync(45_000);
      await vi.waitFor(() => expect(compensationStarted).toBe(true));
      expect(firstSettled).toBe(false);

      resolveCompensation();
      const firstResult = await first;
      expect(firstResult.ok).toBe(false);
      expect(firstSettled).toBe(true);
    } finally {
      timeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('M-007 holds the backup-code lock through resolved-500 reconciliation', async () => {
    let enrollmentStarted = false;
    let finalReconciliationStarted = false;
    let secondRotationStarted = false;
    let resolveEnrollment!: (response: Response) => void;
    const enrollmentBlock = new Promise<Response>(resolve => { resolveEnrollment = resolve; });
    let resolveFinalReconciliation!: () => void;
    const finalReconciliationBlock = new Promise<void>(resolve => {
      resolveFinalReconciliation = resolve;
    });
    const secondFactor = {
      id: 'backup-new-second',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-03-01').toISOString(),
    };
    let listCall = 0;
    let generateCall = 0;
    let enrollCall = 0;
    const failedEnrollment = {
      status: 500,
      ok: false,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue('Internal Server Error'),
    } as unknown as Response;

    vi.mocked(throwOnApiError).mockImplementation(async (res: Response) => {
      if (!res.ok) throw Object.assign(new Error('BACKUP_CODES_FAILED'), { name: 'SanitizedError' });
    });
    vi.mocked(makeRequest).mockImplementation(async (path, options) => {
      if (path === '/api/my-account/mfa-verifications' && !options?.method) {
        listCall++;
        if (listCall === 1 || listCall === 2) return mockOkResponse([]);
        if (listCall === 3) {
          finalReconciliationStarted = true;
          await finalReconciliationBlock;
          return mockOkResponse([]);
        }
        if (listCall === 4) {
          secondRotationStarted = true;
          return mockOkResponse([]);
        }
        return mockOkResponse([secondFactor]);
      }
      if (path.endsWith('/backup-codes/generate')) {
        generateCall++;
        return mockOkResponse({ codes: [generateCall === 1 ? 'FIRST' : 'SECOND'] });
      }
      if (path === '/api/my-account/mfa-verifications' && options?.method === 'POST') {
        enrollCall++;
        if (enrollCall === 1) {
          enrollmentStarted = true;
          return enrollmentBlock;
        }
        return mockOkResponse();
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    const first = generateBackupCodes(validIdentityVrecId);
    await vi.waitFor(() => expect(enrollmentStarted).toBe(true));

    const second = generateBackupCodes(validIdentityVrecId);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(secondRotationStarted).toBe(false);

    resolveEnrollment(failedEnrollment);
    await vi.waitFor(() => expect(finalReconciliationStarted).toBe(true));
    expect(secondRotationStarted).toBe(false);

    resolveFinalReconciliation();
    const firstResult = await first;
    await vi.waitFor(() => expect(secondRotationStarted).toBe(true));
    const secondResult = await second;

    expect(firstResult.ok).toBe(false);
    expect(secondResult.ok).toBe(true);
    expect(secondRotationStarted).toBe(true);
  });

  it('passes one explicit long-deadline signal to every rotation request', async () => {
    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([
        {
          id: 'backup-old-1',
          type: 'BackupCode',
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString(),
        },
      ]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['A1'] }))
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse([{
        id: 'backup-new-1',
        type: 'BackupCode',
        createdAt: new Date('2024-02-01').toISOString(),
      }]));

    const result = await generateBackupCodes(validIdentityVrecId);

    expect(result.ok).toBe(true);
    const signals = vi.mocked(makeRequest).mock.calls.map(([, options]) => options?.signal);
    expect(signals).toHaveLength(5);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(signals[1]).toBe(signals[0]);
    expect(signals[2]).toBe(signals[0]);
    expect(signals[3]).toBe(signals[0]);
    expect(signals[4]).toBeInstanceOf(AbortSignal);
    expect(signals[4]).not.toBe(signals[0]);
  });

  it('M-007 final reconciliation catches enrollment committed after the first compensation re-list', async () => {
    const oldFactor = {
      id: 'backup-old-1',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-01-01').toISOString(),
    };
    const delayedFactor = { ...oldFactor, id: 'backup-delayed-new' };
    let currentFactors = [oldFactor];
    let listCall = 0;

    vi.mocked(makeRequest).mockImplementation(async (path, options) => {
      if (path === '/api/my-account/mfa-verifications' && !options?.method) {
        listCall++;
        if (listCall === 1) return mockOkResponse([oldFactor]);
        if (listCall === 2) {
          const response = mockOkResponse([oldFactor]);
          vi.mocked(response.json).mockImplementationOnce(async () => {
            const snapshot = [...currentFactors];
            queueMicrotask(() => { currentFactors = [oldFactor, delayedFactor]; });
            return snapshot;
          });
          return response;
        }
        return mockOkResponse([...currentFactors]);
      }
      if (path.endsWith('/backup-codes/generate')) {
        return mockOkResponse({ codes: ['UNKNOWN'] });
      }
      if (options?.method === 'POST') {
        throw new Error('enrollment response lost');
      }
      if (path.endsWith('/backup-delayed-new') && options?.method === 'DELETE') {
        currentFactors = [oldFactor];
        return mockOkResponse();
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    const result = await generateBackupCodes(validIdentityVrecId);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected fail-closed error');
    expect(result.error).toBe('BACKUP_CODES_FAILED');
    expect(listCall).toBe(4);
    expect(currentFactors).toEqual([oldFactor]);
    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications/backup-delayed-new',
      expect.objectContaining({ method: 'DELETE', signal: expect.any(AbortSignal) }),
    );
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'mfa.backup_codes.rotation_ambiguous',
      metadata: expect.objectContaining({ stage: 'enroll' }),
    }));
    expect(audit).not.toHaveBeenCalledWith(expect.objectContaining({
      action: 'mfa.backup_codes.generate',
    }));
  });

  it('M-007 compensates a delayed enrollment commit during final reconciliation and leaves clean state', async () => {
    const oldFactor = {
      id: 'backup-old-1',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-01-01').toISOString(),
    };
    const delayedFactor = { ...oldFactor, id: 'backup-delayed-during-reconcile' };
    let currentFactors = [oldFactor];
    let listCall = 0;

    vi.mocked(makeRequest).mockImplementation(async (path, options) => {
      if (path === '/api/my-account/mfa-verifications' && !options?.method) {
        listCall++;
        if (listCall <= 2) return mockOkResponse([oldFactor]);
        if (listCall === 3) {
          currentFactors = [oldFactor, delayedFactor];
        }
        return mockOkResponse([...currentFactors]);
      }
      if (path.endsWith('/backup-codes/generate')) {
        return mockOkResponse({ codes: ['UNKNOWN'] });
      }
      if (options?.method === 'POST') {
        throw new Error('enrollment response lost');
      }
      if (path.endsWith('/backup-delayed-during-reconcile') && options?.method === 'DELETE') {
        currentFactors = [oldFactor];
        return mockOkResponse();
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    const result = await generateBackupCodes(validIdentityVrecId);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected fail-closed error');
    expect(result.error).toBe('BACKUP_CODES_FAILED');
    expect(listCall).toBe(4);
    expect(currentFactors).toEqual([oldFactor]);
  });

  it('M-007 returns success only after final reconciliation confirms the new factor', async () => {
    const oldFactor = {
      id: 'backup-old-1',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-01-01').toISOString(),
    };
    const newFactor = { ...oldFactor, id: 'backup-new-1' };

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([oldFactor]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['NEW1', 'NEW2'] }))
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse([newFactor]));

    const result = await generateBackupCodes(validIdentityVrecId);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected reconciled success');
    expect(result.data.codes).toEqual(['NEW1', 'NEW2']);
    expect(makeRequest).toHaveBeenNthCalledWith(
      5,
      '/api/my-account/mfa-verifications',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'mfa.backup_codes.generate',
    }));
  });

  it('M-007 fails closed and audits divergence when duplicate new factors survive reconciliation', async () => {
    const intendedFactor = {
      id: 'backup-new-intended',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-02-01').toISOString(),
    };
    const duplicateFactor = { ...intendedFactor, id: 'backup-new-duplicate' };
    const enrollResponse = mockOkResponse();
    enrollResponse.clone = vi.fn(() => mockOkResponse({ id: intendedFactor.id }));

    vi.mocked(makeRequest)
      .mockResolvedValueOnce(mockOkResponse([]))
      .mockResolvedValueOnce(mockOkResponse({ codes: ['NEW1'] }))
      .mockResolvedValueOnce(enrollResponse)
      .mockResolvedValueOnce(mockOkResponse([intendedFactor, duplicateFactor]))
      // Simulate an acknowledged compensation DELETE whose remote state did
      // not actually converge before the one allowed confirmation read.
      .mockResolvedValueOnce(mockOkResponse())
      .mockResolvedValueOnce(mockOkResponse([intendedFactor, duplicateFactor]));

    const result = await generateBackupCodes(validIdentityVrecId);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected fail-closed divergence');
    expect(result.error).toBe('BACKUP_CODES_FAILED');
    expect(makeRequest).toHaveBeenCalledWith(
      '/api/my-account/mfa-verifications/backup-new-duplicate',
      expect.objectContaining({ method: 'DELETE', signal: expect.any(AbortSignal) }),
    );
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'mfa.backup_codes.rotation_divergence',
      metadata: expect.objectContaining({ stage: 'final-success' }),
    }));
    expect(audit).not.toHaveBeenCalledWith(expect.objectContaining({
      action: 'mfa.backup_codes.generate',
    }));
  });

  it('M-007 does not release the lock before final reconciliation settles', async () => {
    const newFactor = {
      id: 'backup-new-1',
      type: 'BackupCode' as const,
      createdAt: new Date('2024-01-01').toISOString(),
    };
    let listCall = 0;
    let finalReconciliationStarted = false;
    let secondRotationStarted = false;
    let resolveFinalReconciliation!: () => void;
    const finalReconciliationBlock = new Promise<void>(resolve => {
      resolveFinalReconciliation = resolve;
    });

    vi.mocked(makeRequest).mockImplementation(async (path, options) => {
      if (path === '/api/my-account/mfa-verifications' && !options?.method) {
        listCall++;
        if (listCall === 1) return mockOkResponse([]);
        if (listCall === 2) {
          finalReconciliationStarted = true;
          await finalReconciliationBlock;
          return mockOkResponse([newFactor]);
        }
        secondRotationStarted = true;
        return mockOkResponse([newFactor]);
      }
      if (path.endsWith('/backup-codes/generate')) {
        return mockOkResponse({ codes: [listCall < 3 ? 'FIRST' : 'SECOND'] });
      }
      if (options?.method === 'POST') return mockOkResponse();
      return mockOkResponse();
    });

    const first = generateBackupCodes(validIdentityVrecId);
    await vi.waitFor(() => expect(finalReconciliationStarted).toBe(true));

    const second = generateBackupCodes(validIdentityVrecId);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(secondRotationStarted).toBe(false);

    resolveFinalReconciliation();
    const firstResult = await first;
    expect(firstResult.ok).toBe(true);

    await vi.waitFor(() => expect(secondRotationStarted).toBe(true));
    await second;
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
