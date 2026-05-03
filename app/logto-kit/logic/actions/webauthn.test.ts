import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module Mocks — hoisted above all imports
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
    assertSafeLogtoId: actual.assertSafeLogtoId,
    assertPasskeyName: actual.assertPasskeyName,
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

import {
  requestWebAuthnRegistration,
  verifyAndLinkWebAuthn,
  renamePasskey,
} from './webauthn';
import { ValidationError } from '../validation';

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

const mockErrorResponse = (status = 400): Response =>
  ({
    status,
    ok: false,
    json: vi.fn().mockResolvedValue({ message: 'Error' }),
    text: vi.fn().mockResolvedValue('Bad Request'),
  } as unknown as Response);

// ============================================================================
// requestWebAuthnRegistration
// ============================================================================

describe('requestWebAuthnRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
  });

  it('returns registrationOptions and verificationRecordId on success', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockOkResponse({
        registrationOptions: { challenge: 'abc123' },
        verificationRecordId: 'vrec-abc123',
        expiresAt: '2099-01-01T00:00:00Z',
      })
    );

    const result = await requestWebAuthnRegistration();
    expect(result.verificationRecordId).toBe('vrec-abc123');
    expect(result.registrationOptions).toEqual({ challenge: 'abc123' });
  });

  it('calls makeRequest with POST to the registration endpoint', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockOkResponse({
        registrationOptions: {},
        verificationRecordId: 'vrec-xyz',
        expiresAt: '2099-01-01T00:00:00Z',
      })
    );

    await requestWebAuthnRegistration();

    expect(makeRequest).toHaveBeenCalledWith(
      '/api/verifications/web-authn/registration',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when response has no verificationRecordId', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockOkResponse({ registrationOptions: {} })
    );

    await expect(requestWebAuthnRegistration()).rejects.toThrow();
  });

  it('calls throwOnApiError on error response', async () => {
    vi.mocked(makeRequest).mockResolvedValue(mockErrorResponse(422));
    vi.mocked(throwOnApiError).mockRejectedValue(new Error('MFA_ENROLL_FAILED'));

    await expect(requestWebAuthnRegistration()).rejects.toThrow('MFA_ENROLL_FAILED');
    expect(throwOnApiError).toHaveBeenCalled();
  });
});

// ============================================================================
// verifyAndLinkWebAuthn
// ============================================================================

describe('verifyAndLinkWebAuthn', () => {
  const validPayload = { id: 'cred123', rawId: 'rawid', type: 'public-key', response: {} };
  const validVrecId = 'vrec-abc123';
  const validIdentityVrecId = 'ivrec-def456';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  it('makes two POST requests and succeeds', async () => {
    await verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId);

    expect(makeRequest).toHaveBeenCalledTimes(2);

    const [firstCall, secondCall] = vi.mocked(makeRequest).mock.calls;
    expect(firstCall[0]).toBe('/api/verifications/web-authn/registration/verify');
    expect(secondCall[0]).toBe('/api/my-account/mfa-verifications');
  });

  it('sends correct body for verify step', async () => {
    await verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId);

    const [firstCall] = vi.mocked(makeRequest).mock.calls;
    expect(firstCall[1]).toMatchObject({
      method: 'POST',
      body: { payload: validPayload, verificationRecordId: validVrecId },
    });
  });

  it('sends correct body and headers for link step', async () => {
    await verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId);

    const [, secondCall] = vi.mocked(makeRequest).mock.calls;
    expect(secondCall[1]).toMatchObject({
      method: 'POST',
      body: { type: 'WebAuthn', newIdentifierVerificationRecordId: validVrecId },
      extraHeaders: { 'logto-verification-id': validIdentityVrecId },
    });
  });

  it('throws ValidationError for invalid verificationRecordId', async () => {
    await expect(
      verifyAndLinkWebAuthn(validPayload, '../bad-id', validIdentityVrecId)
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid identityVerificationRecordId', async () => {
    await expect(
      verifyAndLinkWebAuthn(validPayload, validVrecId, '../bad-id')
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for non-object payload', async () => {
    await expect(
      verifyAndLinkWebAuthn('not-an-object', validVrecId, validIdentityVrecId)
    ).rejects.toThrow(ValidationError);

    await expect(
      verifyAndLinkWebAuthn(null, validVrecId, validIdentityVrecId)
    ).rejects.toThrow(ValidationError);
  });

  it('throws when throwOnApiError rejects', async () => {
    vi.mocked(throwOnApiError).mockRejectedValueOnce(new Error('MFA_ENROLL_FAILED'));

    await expect(
      verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId)
    ).rejects.toThrow('MFA_ENROLL_FAILED');
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// renamePasskey
// ============================================================================

describe('renamePasskey', () => {
  const validId = 'passkey-abc123';
  const validIdentityId = 'ivrec-def456';
  const validName = 'My MacBook';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  it('makes a PATCH request to the correct endpoint', async () => {
    await renamePasskey(validId, validName, validIdentityId);

    expect(makeRequest).toHaveBeenCalledWith(
      `/api/my-account/mfa-verifications/${encodeURIComponent(validId)}/name`,
      expect.objectContaining({
        method: 'PATCH',
        body: { name: validName },
        extraHeaders: { 'logto-verification-id': validIdentityId },
      })
    );
  });

  it('throws ValidationError for invalid verificationId (path traversal)', async () => {
    await expect(
      renamePasskey('../bad', validName, validIdentityId)
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for invalid identityVerificationRecordId', async () => {
    await expect(
      renamePasskey(validId, validName, '../bad')
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for empty passkey name', async () => {
    await expect(
      renamePasskey(validId, '', validIdentityId)
    ).rejects.toThrow(ValidationError);

    await expect(
      renamePasskey(validId, '   ', validIdentityId)
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for name over 64 characters', async () => {
    await expect(
      renamePasskey(validId, 'a'.repeat(65), validIdentityId)
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for name with control characters', async () => {
    await expect(
      renamePasskey(validId, 'name\x00inject', validIdentityId)
    ).rejects.toThrow(ValidationError);
  });

  it('accepts a name exactly 64 characters long', async () => {
    await expect(
      renamePasskey(validId, 'a'.repeat(64), validIdentityId)
    ).resolves.toBeUndefined();
  });

  it('throws when throwOnApiError rejects', async () => {
    vi.mocked(throwOnApiError).mockRejectedValueOnce(new Error('MFA_ENROLL_FAILED'));

    await expect(
      renamePasskey(validId, validName, validIdentityId)
    ).rejects.toThrow('MFA_ENROLL_FAILED');
  });
});
