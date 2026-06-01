'use server';

import type { MfaVerification, MfaVerificationPayload } from '../types';
import { assertSafeLogtoId, assertMfaType } from '../guards';
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import { safeAction, type ActionResult, type DataResult } from './safe';
import { ValidationError } from '../validation';

/**
 * Gets the user's MFA verifications.
 * @returns Array of MFA verifications.
 */
export async function getMfaVerifications(): Promise<DataResult<MfaVerification[]>> {
  return safeAction(async () => {
    const res = await makeRequest('/api/my-account/mfa-verifications');
    
    await throwOnApiError(res, 'FETCH_FAILED', 'get-mfa');

    const data = await res.json();
    // Handle possible response shapes - API may return bare array or wrapped object
    const verifications: MfaVerification[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.verifications)
        ? data.verifications
        : Array.isArray(data?.data)
          ? data.data
          : [];
    return verifications;
  });
}

/**
 * Generates a new TOTP secret for MFA setup.
 * @returns Object containing the secret.
 */
export async function generateTotpSecret(): Promise<DataResult<{ secret: string }>> {
  return safeAction(async () => {
    const res = await makeRequest('/api/my-account/mfa-verifications/totp-secret/generate', {
      method: 'POST',
    });
    
    await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'totp-secret');

    return res.json();
  });
}

/**
 * Adds a new MFA verification.
 * @param verification - The MFA verification payload.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function addMfaVerification(
  verification: MfaVerificationPayload,
  identityVerificationRecordId: string
): Promise<ActionResult> {
  return safeAction(async () => {
    assertMfaType(verification.type);
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    const { type, payload } = verification;

    // ── Validate payload fields (type-safe via discriminated union) ────────
    if (type === 'Totp') {
      // TotpVerificationPayload: { code: string; secret: string }
      if (typeof payload.code !== 'string' || payload.code.length > 16) {
        throw new ValidationError('INVALID_INPUT', 'verification.code');
      }
      if (typeof payload.secret !== 'string' || payload.secret.length > 64) {
        throw new ValidationError('INVALID_INPUT', 'verification.secret');
      }
    } else {
      // WebAuthn / BackupCode - both have [key: string]: unknown index signatures
      const genericPayload = payload as Record<string, unknown>;
      if (typeof genericPayload.code === 'string' && genericPayload.code.length > 16) {
        throw new ValidationError('INVALID_INPUT', 'verification.code');
      }
      if (typeof genericPayload.secret === 'string' && genericPayload.secret.length > 64) {
        throw new ValidationError('INVALID_INPUT', 'verification.secret');
      }
      if (
        typeof genericPayload.newIdentifierVerificationRecordId === 'string' &&
        genericPayload.newIdentifierVerificationRecordId.length > 128
      ) {
        throw new ValidationError('INVALID_INPUT', 'verification.newIdentifierVerificationRecordId');
      }
    }

    const res = await makeRequest('/api/my-account/mfa-verifications', {
      method: 'POST',
      body: { type, ...payload },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    
    await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'mfa-add');

    // Audit (best-effort - failure must not break the main action)
    try {
      const { audit } = await import('../audit');
      const _token = await getTokenForServerAction();
      const _intro = await introspectToken(_token);
      await audit({ actor: _intro.sub ?? 'unknown', action: `mfa.${verification.type.toLowerCase()}.enroll` });
    } catch { /* audit is best-effort; never surface to caller */ }
  });
}

/**
 * Deletes an MFA verification.
 * @param verificationId - The ID of the verification to delete.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function deleteMfaVerification(
  verificationId: string,
  identityVerificationRecordId: string
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(verificationId, 'verificationId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    const res = await makeRequest(`/api/my-account/mfa-verifications/${encodeURIComponent(verificationId)}`, {
      method: 'DELETE',
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    
    await throwOnApiError(res, 'MFA_REMOVE_FAILED', 'mfa-remove');

    // Audit (best-effort - failure must not break the main action)
    try {
      const { audit } = await import('../audit');
      const _token = await getTokenForServerAction();
      const _intro = await introspectToken(_token);
      await audit({ actor: _intro.sub ?? 'unknown', action: 'mfa.remove', resource: verificationId });
    } catch { /* audit is best-effort; never surface to caller */ }
  });
}

/**
 * Generates new backup codes.
 * @param identityVerificationRecordId - Verification record for identity.
 * @returns Object containing the backup codes.
 */
export async function generateBackupCodes(identityVerificationRecordId: string): Promise<DataResult<{ codes: string[] }>> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // Step 1: Generate codes (no verification header needed)
    const genRes = await makeRequest('/api/my-account/mfa-verifications/backup-codes/generate', {
      method: 'POST',
    });

    await throwOnApiError(genRes, 'BACKUP_CODES_FAILED', 'backup-gen');

    const { codes } = await genRes.json();

    // Step 2: Enroll/bind codes to the account.
    const enrollRes = await makeRequest('/api/my-account/mfa-verifications', {
      method: 'POST',
      body: { type: 'BackupCode', codes },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });

    await throwOnApiError(enrollRes, 'BACKUP_CODES_FAILED', 'backup-enroll');

    // Audit (best-effort - failure must not break the main action)
    try {
      const { audit } = await import('../audit');
      const _token = await getTokenForServerAction();
      const _intro = await introspectToken(_token);
      await audit({ actor: _intro.sub ?? 'unknown', action: 'mfa.backup_codes.generate' });
    } catch { /* audit is best-effort; never surface to caller */ }

    return { codes };
  });
}

/**
 * Gets the user's backup codes.
 * @param identityVerificationRecordId - Verification record for identity.
 * @returns Object containing the backup codes with their used status.
 */
export async function getBackupCodes(
  identityVerificationRecordId: string
): Promise<DataResult<{ codes: Array<{ code: string; usedAt: string | null }> }>> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    const res = await makeRequest('/api/my-account/mfa-verifications/backup-codes', {
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    
    await throwOnApiError(res, 'BACKUP_CODES_FAILED', 'backup-get');

    return res.json();
  });
}

export async function replaceTotpVerification(
  secret: string,
  code: string,
  identityVerificationRecordId: string
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    const res = await makeRequest('/api/my-account/mfa-verifications/totp', {
      method: 'PUT',
      body: { secret, code },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });

    await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'totp-replace');

    try {
      const { audit } = await import('../audit');
      const _token = await getTokenForServerAction();
      const _intro = await introspectToken(_token);
      await audit({ actor: _intro.sub ?? 'unknown', action: 'mfa.totp.replace' });
    } catch { }
  });
}
