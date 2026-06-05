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

vi.mock('../errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
}));

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

// ============================================================================
// Imports of mocked modules
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';

// ============================================================================
// Imports under test
// ============================================================================

import { addMfaVerification, generateBackupCodes } from './mfa';

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
});
