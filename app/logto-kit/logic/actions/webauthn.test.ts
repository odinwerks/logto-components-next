import { describe, it, expect, vi, beforeEach } from 'vitest';

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

    const r = await requestWebAuthnRegistration();
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('Expected success');
    expect(r.data.verificationRecordId).toBe('vrec-abc123');
    expect(r.data.registrationOptions).toEqual({ challenge: 'abc123' });
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

  it('returns error when response has no verificationRecordId', async () => {
    vi.mocked(makeRequest).mockResolvedValue(
      mockOkResponse({ registrationOptions: {} })
    );

    const r = await requestWebAuthnRegistration();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('MFA_ENROLL_FAILED');
  });

  it('returns error on error response', async () => {
    vi.mocked(makeRequest).mockResolvedValue(mockErrorResponse(422));
    vi.mocked(throwOnApiError).mockRejectedValue(new Error('MFA_ENROLL_FAILED'));

    const r = await requestWebAuthnRegistration();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('MFA_ENROLL_FAILED');
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
  const validTimestamp = Date.now() + 600000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  it('makes two POST requests and succeeds', async () => {
    const r = await verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(true);

    expect(makeRequest).toHaveBeenCalledTimes(2);

    const [firstCall, secondCall] = vi.mocked(makeRequest).mock.calls;
    expect(firstCall[0]).toBe('/api/verifications/web-authn/registration/verify');
    expect(secondCall[0]).toBe('/api/my-account/mfa-verifications');
  });

  it('sends correct body for verify step', async () => {
    const r = await verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(true);

    const [firstCall] = vi.mocked(makeRequest).mock.calls;
    expect(firstCall[1]).toMatchObject({
      method: 'POST',
      body: { payload: { ...validPayload, type: 'WebAuthn' }, verificationRecordId: validVrecId },
    });
  });

  it('sends correct body and headers for link step', async () => {
    const r = await verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(true);

    const [, secondCall] = vi.mocked(makeRequest).mock.calls;
    expect(secondCall[1]).toMatchObject({
      method: 'POST',
      body: { type: 'WebAuthn', newIdentifierVerificationRecordId: validVrecId },
      extraHeaders: { 'logto-verification-id': validIdentityVrecId },
    });
  });

  it('returns error for invalid verificationRecordId', async () => {
    const r = await verifyAndLinkWebAuthn(validPayload, '../bad-id', validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_ID');
  });

  it('returns error for invalid identityVerificationRecordId', async () => {
    const r = await verifyAndLinkWebAuthn(validPayload, validVrecId, '../bad-id', validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_ID');
  });

  it('returns error for non-object payload', async () => {
    let r = await verifyAndLinkWebAuthn('not-an-object', validVrecId, validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');

    r = await verifyAndLinkWebAuthn(null, validVrecId, validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_INPUT');
  });

  it('returns error when throwOnApiError rejects', async () => {
    vi.mocked(throwOnApiError).mockRejectedValueOnce(new Error('MFA_ENROLL_FAILED'));

    const r = await verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('MFA_ENROLL_FAILED');
    expect(makeRequest).toHaveBeenCalledTimes(1);
  });

  it('returns UNAUTHORIZED when token is inactive', async () => {
    const { introspectToken } = await import('../utils');
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: 'user-test-123', active: false });

    const r = await verifyAndLinkWebAuthn(validPayload, validVrecId, validIdentityVrecId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toBe('UNAUTHORIZED');
  });
});

// ============================================================================
// renamePasskey
// ============================================================================

describe('renamePasskey', () => {
  const validId = 'passkey-abc123';
  const validIdentityId = 'ivrec-def456';
  const validName = 'My MacBook';
  const validTimestamp = Date.now() + 600000;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(throwOnApiError).mockResolvedValue(undefined);
    vi.mocked(makeRequest).mockResolvedValue(mockOkResponse());
  });

  it('makes a PATCH request to the correct endpoint', async () => {
    const r = await renamePasskey(validId, validName, validIdentityId, validTimestamp);
    expect(r.ok).toBe(true);

    expect(makeRequest).toHaveBeenCalledWith(
      `/api/my-account/mfa-verifications/${encodeURIComponent(validId)}/name`,
      expect.objectContaining({
        method: 'PATCH',
        body: { name: validName },
        extraHeaders: { 'logto-verification-id': validIdentityId },
      })
    );
  });

  it('returns error for invalid verificationId (path traversal)', async () => {
    const r = await renamePasskey('../bad', validName, validIdentityId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_ID');
  });

  it('returns error for invalid identityVerificationRecordId', async () => {
    const r = await renamePasskey(validId, validName, '../bad', validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_ID');
  });

  it('returns error for empty passkey name', async () => {
    let r = await renamePasskey(validId, '', validIdentityId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_FIELD_TYPE');

    r = await renamePasskey(validId, '   ', validIdentityId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_FIELD_TYPE');
  });

  it('returns error for name over 64 characters', async () => {
    const r = await renamePasskey(validId, 'a'.repeat(65), validIdentityId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('FIELD_TOO_LONG');
  });

  it('returns error for name with control characters', async () => {
    const r = await renamePasskey(validId, 'name\x00inject', validIdentityId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('INVALID_CHARS');
  });

  it('accepts a name exactly 64 characters long', async () => {
    const r = await renamePasskey(validId, 'a'.repeat(64), validIdentityId, validTimestamp);
    expect(r.ok).toBe(true);
  });

  it('returns error when throwOnApiError rejects', async () => {
    vi.mocked(throwOnApiError).mockRejectedValueOnce(new Error('MFA_ENROLL_FAILED'));

    const r = await renamePasskey(validId, validName, validIdentityId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toContain('MFA_ENROLL_FAILED');
  });

  it('returns UNAUTHORIZED when token is inactive', async () => {
    const { introspectToken } = await import('../utils');
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: 'user-test-123', active: false });

    const r = await renamePasskey(validId, validName, validIdentityId, validTimestamp);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('Expected failure');
    expect(r.error).toBe('UNAUTHORIZED');
  });
});
