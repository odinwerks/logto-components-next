import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

const mockCountryFilter = {
  mode: 'none' as 'none' | 'allow' | 'block',
  codes: [] as string[],
};

vi.mock('../../config', () => ({
  getCountryFilter: () => mockCountryFilter,
  getBackendType: () => 'blacktop',
}));

vi.mock('./request', () => ({
  makeRequest: vi.fn(),
}));

vi.mock('../errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
  plainCode: vi.fn((code: string) => {
    const err = new Error(code);
    err.name = 'SanitizedError';
    return err;
  }),
  sanitize: vi.fn((_err: unknown, opts: { fallback: string }) => {
    const e = new Error(opts.fallback);
    e.name = 'SanitizedError';
    return e;
  }),
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

vi.mock('../utils', () => ({
  introspectToken: vi.fn().mockResolvedValue({ sub: 'user-test-123', active: true }),
}));

// ============================================================================
// Imports of mocked modules (for vi.mocked usage)
// ============================================================================

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';

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
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
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

  it('correctly handles expiresAt as a Unix timestamp in seconds', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ verificationRecordId: 'verif_abc456', expiresAt: 1717441200 })
    );
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('valid-password-123');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data.verificationTimestamp).toBe(1717441200000);
  });

  it('correctly handles expiresAt as a Unix timestamp in milliseconds', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ verificationRecordId: 'verif_abc456', expiresAt: 1717441200000 })
    );
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('valid-password-123');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data.verificationTimestamp).toBe(1717441200000);
  });

  it('correctly handles expiresAt as an ISO string', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ verificationRecordId: 'verif_abc456', expiresAt: '2024-06-03T19:00:00.000Z' })
    );
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('valid-password-123');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data.verificationTimestamp).toBe(new Date('2024-06-03T19:00:00.000Z').getTime());
  });

  it('does NOT call makeRequest when validation fails', async () => {
    const { verifyPasswordForIdentity } = await import('./verification');
    await verifyPasswordForIdentity('');
    expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
  });

  it('returns UNAUTHENTICATED when session token is inactive', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ active: false, sub: undefined });
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('ValidPassword1!');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHENTICATED');
    // makeRequest must NOT be called before auth check passes
    expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
  });

  it('returns UNAUTHENTICATED when no session token is available', async () => {
    vi.mocked(getTokenForServerAction).mockRejectedValueOnce(new Error('No access token available for Account API'));
    const { verifyPasswordForIdentity } = await import('./verification');
    const result = await verifyPasswordForIdentity('ValidPassword1!');
    expect(result.ok).toBe(false);
    expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
  });
});

// ============================================================================
// updateEmailWithVerification - Staleness Check
// ============================================================================

describe('updateEmailWithVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(makeRequest).mockResolvedValue(mockJsonResponse({}));
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('rejects when verificationTimestamp is in the past (staleness check)', async () => {
    const { updateEmailWithVerification } = await import('./verification');
    const expiredTimestamp = Date.now() - 16_000; // 16 seconds ago (beyond 15s tolerance)
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

  it('accepts when verificationTimestamp is within 15s tolerance (boundary)', async () => {
    const { updateEmailWithVerification } = await import('./verification');
    const mockNow = 1234567890000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    try {
      const withinTolerance = mockNow - 15_000; // exactly 15 seconds ago (within tolerance)
      const result = await updateEmailWithVerification(
        'new@example.com',
        'vr_identifier',
        'vr_identity',
        withinTolerance,
      );
      expect(result.ok).toBe(true);
      expect(vi.mocked(makeRequest)).toHaveBeenCalled();
    } finally {
      dateSpy.mockRestore();
    }
  });

  it('rejects when verificationTimestamp is just beyond 15s tolerance (boundary)', async () => {
    const { updateEmailWithVerification } = await import('./verification');
    const mockNow = 1234567890000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    try {
      const justBeyondTolerance = mockNow - 15_001; // 15.001 seconds ago (beyond tolerance)
      const result = await updateEmailWithVerification(
        'new@example.com',
        'vr_identifier',
        'vr_identity',
        justBeyondTolerance,
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected error');
      expect(result.error).toBe('VERIFICATION_EXPIRED');
      expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
    } finally {
      dateSpy.mockRestore();
    }
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
    const mockNow = 1700000000000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    try {
      const result = await updateEmailWithVerification(
        'new@example.com',
        'vr_identifier',
        'vr_identity',
        mockNow,
      );
      expect(result.ok).toBe(true);
      expect(vi.mocked(makeRequest)).toHaveBeenCalled();
    } finally {
      dateSpy.mockRestore();
    }
  });
});

// ============================================================================
// updatePhoneWithVerification - Staleness Check
// ============================================================================

describe('updatePhoneWithVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(makeRequest).mockResolvedValue(mockJsonResponse({}));
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('rejects when verificationTimestamp is in the past (staleness check)', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const expiredTimestamp = Date.now() - 16_000; // 16 seconds ago (beyond 15s tolerance)
    const result = await updatePhoneWithVerification(
      '1234567890',
      'vr_identifier',
      'vr_identity',
      expiredTimestamp,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('VERIFICATION_EXPIRED');
    expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
  });

  it('accepts when verificationTimestamp is within 15s tolerance (boundary)', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const mockNow = 1234567890000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    try {
      const withinTolerance = mockNow - 15_000; // exactly 15 seconds ago (within tolerance)
      const result = await updatePhoneWithVerification(
        '+1234567890',
        'vr_identifier',
        'vr_identity',
        withinTolerance,
      );
      expect(result.ok).toBe(true);
      expect(vi.mocked(makeRequest)).toHaveBeenCalled();
    } finally {
      dateSpy.mockRestore();
    }
  });

  it('rejects when verificationTimestamp is just beyond 15s tolerance (boundary)', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const mockNow = 1234567890000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    try {
      const justBeyondTolerance = mockNow - 15_001; // 15.001 seconds ago (beyond tolerance)
      const result = await updatePhoneWithVerification(
        '+1234567890',
        'vr_identifier',
        'vr_identity',
        justBeyondTolerance,
      );
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected error');
      expect(result.error).toBe('VERIFICATION_EXPIRED');
      expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
    } finally {
      dateSpy.mockRestore();
    }
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
        body: { phone: '1234567890', newIdentifierVerificationRecordId: 'vr_identifier' },
        extraHeaders: { 'logto-verification-id': 'vr_identity' },
      })
    );
  });

  it('normalizes formatted phone number and updates with primary phone', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const futureTimestamp = Date.now() + 10 * 60 * 1000;
    const result = await updatePhoneWithVerification(
      '+1 (234) 567-8901',
      'vr_identifier',
      'vr_identity',
      futureTimestamp,
    );
    expect(result.ok).toBe(true);
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/my-account/primary-phone',
      expect.objectContaining({
        method: 'POST',
        body: { phone: '12345678901', newIdentifierVerificationRecordId: 'vr_identifier' },
        extraHeaders: { 'logto-verification-id': 'vr_identity' },
      })
    );
  });

  it('rejects non-string phone input (undefined)', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const futureTimestamp = Date.now() + 10 * 60 * 1000;
    const result = await updatePhoneWithVerification(
      undefined as unknown as string,
      'vr_identifier',
      'vr_identity',
      futureTimestamp,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects non-string phone input (null)', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const futureTimestamp = Date.now() + 10 * 60 * 1000;
    const result = await updatePhoneWithVerification(
      null as unknown as string,
      'vr_identifier',
      'vr_identity',
      futureTimestamp,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects non-string phone input (object)', async () => {
    const { updatePhoneWithVerification } = await import('./verification');
    const futureTimestamp = Date.now() + 10 * 60 * 1000;
    const result = await updatePhoneWithVerification(
      {} as unknown as string,
      'vr_identifier',
      'vr_identity',
      futureTimestamp,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });
});

// ============================================================================
// sendPhoneVerificationCode - Normalization and Validation
// ============================================================================

describe('sendPhoneVerificationCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ verificationRecordId: 'verif_phone123' })
    );
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('accepts a clean phone number and calls the API', async () => {
    const { sendPhoneVerificationCode } = await import('./verification');
    const result = await sendPhoneVerificationCode('+15555555555');
    expect(result.ok).toBe(true);
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/verifications/verification-code',
      expect.objectContaining({
        method: 'POST',
        body: { identifier: { type: 'phone', value: '15555555555' } },
      })
    );
  });

  it('normalizes spaces, hyphens, and parentheses in phone numbers', async () => {
    const { sendPhoneVerificationCode } = await import('./verification');
    const result = await sendPhoneVerificationCode('+1 (555) 555-5555');
    expect(result.ok).toBe(true);
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/verifications/verification-code',
      expect.objectContaining({
        method: 'POST',
        body: { identifier: { type: 'phone', value: '15555555555' } },
      })
    );
  });

  it('rejects non-numeric input (empty after cleaning)', async () => {
    const { sendPhoneVerificationCode } = await import('./verification');
    const result = await sendPhoneVerificationCode('abc'); // no digits at all
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('accepts phone numbers without + prefix (regression: 511147839)', async () => {
    const { sendPhoneVerificationCode } = await import('./verification');
    const result = await sendPhoneVerificationCode('511147839');
    expect(result.ok).toBe(true);
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/verifications/verification-code',
      expect.objectContaining({
        method: 'POST',
        body: { identifier: { type: 'phone', value: '511147839' } },
      })
    );
  });

  it('rejects non-string phone input (undefined)', async () => {
    const { sendPhoneVerificationCode } = await import('./verification');
    const result = await sendPhoneVerificationCode(undefined as unknown as string);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects non-string phone input (null)', async () => {
    const { sendPhoneVerificationCode } = await import('./verification');
    const result = await sendPhoneVerificationCode(null as unknown as string);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects non-string phone input (object)', async () => {
    const { sendPhoneVerificationCode } = await import('./verification');
    const result = await sendPhoneVerificationCode({} as unknown as string);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });
});

// ============================================================================
// verifyVerificationCode - Phone Normalization
// ============================================================================

describe('verifyVerificationCode with phone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ verificationRecordId: 'verif_ok' })
    );
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('normalizes and verifies a formatted phone number', async () => {
    const { verifyVerificationCode } = await import('./verification');
    const result = await verifyVerificationCode(
      'phone',
      '+1-555-555-5555',
      'verif_id',
      '123456'
    );
    expect(result.ok).toBe(true);
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/verifications/verification-code/verify',
      expect.objectContaining({
        method: 'POST',
        body: {
          identifier: { type: 'phone', value: '15555555555' },
          verificationId: 'verif_id',
          code: '123456',
        },
      })
    );
  });

  it('does not normalize email format', async () => {
    const { verifyVerificationCode } = await import('./verification');
    const result = await verifyVerificationCode(
      'email',
      'test@example.com',
      'verif_id',
      '123456'
    );
    expect(result.ok).toBe(true);
    expect(vi.mocked(makeRequest)).toHaveBeenCalledWith(
      '/api/verifications/verification-code/verify',
      expect.objectContaining({
        method: 'POST',
        body: {
          identifier: { type: 'email', value: 'test@example.com' },
          verificationId: 'verif_id',
          code: '123456',
        },
      })
    );
  });

  it('rejects non-string phone input (undefined)', async () => {
    const { verifyVerificationCode } = await import('./verification');
    const result = await verifyVerificationCode(
      'phone',
      undefined as unknown as string,
      'verif_id',
      '123456'
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects non-string phone input (null)', async () => {
    const { verifyVerificationCode } = await import('./verification');
    const result = await verifyVerificationCode(
      'phone',
      null as unknown as string,
      'verif_id',
      '123456'
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });

  it('rejects non-string phone input (object)', async () => {
    const { verifyVerificationCode } = await import('./verification');
    const result = await verifyVerificationCode(
      'phone',
      {} as unknown as string,
      'verif_id',
      '123456'
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });
});

// ============================================================================
// Country Gating - Phone Verification
// ============================================================================

describe('Country Gating on Phone Verification Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(makeRequest).mockResolvedValue(
      mockJsonResponse({ verificationRecordId: 'verif_123' })
    );
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    
    mockCountryFilter.mode = 'none';
    mockCountryFilter.codes = [];
  });

  describe('sendPhoneVerificationCode gating', () => {
    it('allows any country when mode is none', async () => {
      const { sendPhoneVerificationCode } = await import('./verification');
      const result = await sendPhoneVerificationCode('+380501234567'); // UA
      expect(result.ok).toBe(true);
    });

    it('blocks disallowed country in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed
      
      const { sendPhoneVerificationCode } = await import('./verification');
      const result = await sendPhoneVerificationCode('+14155552671'); // US
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');
      expect(result.error).toBe('PHONE_COUNTRY_NOT_ALLOWED');
    });

    it('allows allowed country in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed

      const { sendPhoneVerificationCode } = await import('./verification');
      const result = await sendPhoneVerificationCode('+380501234567'); // UA
      expect(result.ok).toBe(true);
    });

    it('blocks unmapped country (e.g. Malawi) in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed

      const { sendPhoneVerificationCode } = await import('./verification');
      const result = await sendPhoneVerificationCode('+2651234567'); // MW (unmapped)
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');
      expect(result.error).toBe('PHONE_COUNTRY_NOT_ALLOWED');
    });

    it('allows unmapped country (e.g. Malawi) in block list mode', async () => {
      mockCountryFilter.mode = 'block';
      mockCountryFilter.codes = ['380']; // Only Ukraine blocked

      const { sendPhoneVerificationCode } = await import('./verification');
      const result = await sendPhoneVerificationCode('+2651234567'); // MW (unmapped)
      expect(result.ok).toBe(true);
    });

    it('blocks explicitly blocked country in block list mode', async () => {
      mockCountryFilter.mode = 'block';
      mockCountryFilter.codes = ['1']; // US/CA blocked

      const { sendPhoneVerificationCode } = await import('./verification');
      const result = await sendPhoneVerificationCode('+14155552671');
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');
      expect(result.error).toBe('PHONE_COUNTRY_NOT_ALLOWED');
      expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
    });
  });

  describe('verifyVerificationCode gating', () => {
    it('allows any country when mode is none', async () => {
      const { verifyVerificationCode } = await import('./verification');
      const result = await verifyVerificationCode('phone', '+380501234567', 'ver_id', '123456');
      expect(result.ok).toBe(true);
    });

    it('blocks disallowed country in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed

      const { verifyVerificationCode } = await import('./verification');
      const result = await verifyVerificationCode('phone', '+14155552671', 'ver_id', '123456');
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');
      expect(result.error).toBe('PHONE_COUNTRY_NOT_ALLOWED');
    });

    it('allows allowed country in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed

      const { verifyVerificationCode } = await import('./verification');
      const result = await verifyVerificationCode('phone', '+380501234567', 'ver_id', '123456');
      expect(result.ok).toBe(true);
    });

    it('blocks unmapped country (e.g. Malawi) in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed

      const { verifyVerificationCode } = await import('./verification');
      const result = await verifyVerificationCode('phone', '+2651234567', 'ver_id', '123456'); // MW (unmapped)
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');
      expect(result.error).toBe('PHONE_COUNTRY_NOT_ALLOWED');
    });

    it('allows unmapped country (e.g. Malawi) in block list mode', async () => {
      mockCountryFilter.mode = 'block';
      mockCountryFilter.codes = ['380']; // Only Ukraine blocked

      const { verifyVerificationCode } = await import('./verification');
      const result = await verifyVerificationCode('phone', '+2651234567', 'ver_id', '123456'); // MW (unmapped)
      expect(result.ok).toBe(true);
    });
  });

  describe('updatePhoneWithVerification gating', () => {
    const futureTimestamp = Date.now() + 10 * 60 * 1000;

    it('allows any country when mode is none', async () => {
      const { updatePhoneWithVerification } = await import('./verification');
      const result = await updatePhoneWithVerification('+380501234567', 'id_ver', 'id_ident', futureTimestamp);
      expect(result.ok).toBe(true);
    });

    it('blocks disallowed country in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed

      const { updatePhoneWithVerification } = await import('./verification');
      const result = await updatePhoneWithVerification('+14155552671', 'id_ver', 'id_ident', futureTimestamp);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');
      expect(result.error).toBe('PHONE_COUNTRY_NOT_ALLOWED');
    });

    it('allows allowed country in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed

      const { updatePhoneWithVerification } = await import('./verification');
      const result = await updatePhoneWithVerification('+380501234567', 'id_ver', 'id_ident', futureTimestamp);
      expect(result.ok).toBe(true);
    });

    it('blocks unmapped country (e.g. Malawi) in allow list mode', async () => {
      mockCountryFilter.mode = 'allow';
      mockCountryFilter.codes = ['380']; // Only Ukraine allowed

      const { updatePhoneWithVerification } = await import('./verification');
      const result = await updatePhoneWithVerification('+2651234567', 'id_ver', 'id_ident', futureTimestamp); // MW (unmapped)
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');
      expect(result.error).toBe('PHONE_COUNTRY_NOT_ALLOWED');
    });

    it('allows unmapped country (e.g. Malawi) in block list mode', async () => {
      mockCountryFilter.mode = 'block';
      mockCountryFilter.codes = ['380']; // Only Ukraine blocked

      const { updatePhoneWithVerification } = await import('./verification');
      const result = await updatePhoneWithVerification('+2651234567', 'id_ver', 'id_ident', futureTimestamp); // MW (unmapped)
      expect(result.ok).toBe(true);
    });

    it('blocks explicitly blocked country in block list mode', async () => {
      mockCountryFilter.mode = 'block';
      mockCountryFilter.codes = ['1']; // US/CA blocked

      const { updatePhoneWithVerification } = await import('./verification');
      const result = await updatePhoneWithVerification('+14155552671', 'id_ver', 'id_ident', futureTimestamp);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected failure');
      expect(result.error).toBe('PHONE_COUNTRY_NOT_ALLOWED');
      expect(vi.mocked(makeRequest)).not.toHaveBeenCalled();
    });
  });
});
