import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

vi.mock('./request', () => ({
  makeRequest: vi.fn(),
}));

vi.mock('../errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================================
// Imports of mocked modules (for vi.mocked usage)
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';

// ============================================================================
// Test Helpers
// ============================================================================

/** Build a mock Response that resolves .json() to the given data. */
const mockJsonResponse = (data: unknown, status = 200): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data),
  }) as unknown as Response;

// ============================================================================
// verifyPasswordForIdentity - Input Validation
// ============================================================================

describe('verifyPasswordForIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ verificationRecordId: 'verif_test123' })
    );
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('rejects non-string input (undefined)', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity(undefined as unknown as string);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects non-string input (null)', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity(null as unknown as string);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects empty string password', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects string longer than 256 characters', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    const longPassword = 'a'.repeat(257);
    const result = await verifyPasswordForIdentity(longPassword);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects string with control characters', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('pass\x00word');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects string with null byte', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('pass\x00word');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('accepts valid password and makes API request', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('MySecureP@ss1');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data.verificationRecordId).toBe('verif_test123');
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/verifications/password',
      expect.objectContaining({
        method: 'POST',
        body: { password: 'MySecureP@ss1' },
      })
    );
  });

  it('returns verificationRecordId from successful API response', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ verificationRecordId: 'verif_abc456' })
    );
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('valid-password-123');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data.verificationRecordId).toBe('verif_abc456');
  });

  it('does NOT call makeRequest when validation fails', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    await verifyPasswordForIdentity('');
    expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
  });
});

// ============================================================================
// updateEmailWithVerification - Staleness Check
// ============================================================================

describe('updateEmailWithVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(makeRequest).mockResolvedValue(mockJsonResponse({}));
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('rejects when verificationTimestamp is in the past (staleness check)', async () => {
    const { updateEmailWithVerification } = await import('./verification');
    const expiredTimestamp = Date.now() - 1000; // 1 second ago
    const result = await updateEmailWithVerification(
      'new@example.com',
      'vr_identifier',
      'vr_identity',
      expiredTimestamp,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
  });

  it('accepts when verificationTimestamp is in the future', async () => {
    const { updateEmailWithVerification } = await import('./verification');
    const futureTimestamp = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    const result = await updateEmailWithVerification(
      'new@example.com',
      'vr_identifier',
      'vr_identity',
      futureTimestamp,
    );
    expect(result.ok).toBe(true);
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/my-account/primary-email',
      expect.objectContaining({
        method: 'POST',
        body: { email: 'new@example.com', newIdentifierVerificationRecordId: 'vr_identifier' },
        extraHeaders: { 'logto-verification-id': 'vr_identity' },
      })
    );
  });

  it('accepts when verificationTimestamp is exactly now (boundary)', async () => {
    const { updateEmailWithVerification } = await import('./verification');
    const now = Date.now();
    const result = await updateEmailWithVerification(
      'new@example.com',
      'vr_identifier',
      'vr_identity',
      now,
    );
    // Date.now() > now should be false at exact boundary (depends on timing)
    // At minimum, it should not throw before making the request
    expect(vi.mocked(makeRequest)).toHaveBeenCalled();
  });
});

// ============================================================================
// updatePhoneWithVerification - Staleness Check
// ============================================================================

describe('updatePhoneWithVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(makeRequest).mockResolvedValue(mockJsonResponse({}));
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('rejects when verificationTimestamp is in the past (staleness check)', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const expiredTimestamp = Date.now() - 1000;
    const result = await updatePhoneWithVerification(
      '+1234567890',
      'vr_identifier',
      'vr_identity',
      expiredTimestamp,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
  });

  it('accepts when verificationTimestamp is in the future', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const futureTimestamp = Date.now() + 10 * 60 * 1000;
    const result = await updatePhoneWithVerification(
      '+1234567890',
      'vr_identifier',
      'vr_identity',
      futureTimestamp,
    );
    expect(result.ok).toBe(true);
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/my-account/primary-phone',
      expect.objectContaining({
        method: 'POST',
        body: { phone: '+1234567890', newIdentifierVerificationRecordId: 'vr_identifier' },
        extraHeaders: { 'logto-verification-id': 'vr_identity' },
      })
    );
  });
});
