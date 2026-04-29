'use server';

import type { MfaVerification, MfaVerificationPayload } from '../types';
import { assertSafeLogtoId, assertMfaType } from '../guards';
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';

/**
 * Gets the user's MFA verifications.
 * @returns Array of MFA verifications.
 */
export async function getMfaVerifications(): Promise<MfaVerification[]> {
  const res = await makeRequest('/api/my-account/mfa-verifications');
  
  await throwOnApiError(res, 'FETCH_FAILED', 'get-mfa');

  return res.json();
}

/**
 * Generates a new TOTP secret for MFA setup.
 * @returns Object containing the secret.
 */
export async function generateTotpSecret(): Promise<{ secret: string }> {
  const res = await makeRequest('/api/my-account/mfa-verifications/totp-secret/generate', {
    method: 'POST',
  });
  
  await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'totp-secret');

  return res.json();
}

/**
 * Adds a new MFA verification.
 * @param verification - The MFA verification payload.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function addMfaVerification(
  verification: MfaVerificationPayload,
  identityVerificationRecordId: string
): Promise<void> {
  assertMfaType(verification.type);
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const { type, payload } = verification;
  const res = await makeRequest('/api/my-account/mfa-verifications', {
    method: 'POST',
    body: { type, ...payload },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'mfa-add');

  // Audit (best-effort — failure must not break the main action)
  try {
    const { audit } = await import('../audit');
    const _token = await getTokenForServerAction();
    const _intro = await introspectToken(_token);
    await audit({ actor: _intro.sub ?? 'unknown', action: `mfa.${verification.type.toLowerCase()}.enroll` });
  } catch { /* audit is best-effort; never surface to caller */ }
}

/**
 * Deletes an MFA verification.
 * @param verificationId - The ID of the verification to delete.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function deleteMfaVerification(
  verificationId: string,
  identityVerificationRecordId: string
): Promise<void> {
  assertSafeLogtoId(verificationId, 'verificationId');
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const res = await makeRequest(`/api/my-account/mfa-verifications/${encodeURIComponent(verificationId)}`, {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'MFA_REMOVE_FAILED', 'mfa-remove');

  // Audit (best-effort — failure must not break the main action)
  try {
    const { audit } = await import('../audit');
    const _token = await getTokenForServerAction();
    const _intro = await introspectToken(_token);
    await audit({ actor: _intro.sub ?? 'unknown', action: 'mfa.remove', resource: verificationId });
  } catch { /* audit is best-effort; never surface to caller */ }
}

/**
 * Generates new backup codes.
 * @param identityVerificationRecordId - Verification record for identity.
 * @returns Object containing the backup codes.
 */
export async function generateBackupCodes(identityVerificationRecordId: string): Promise<{ codes: string[] }> {
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const res = await makeRequest('/api/my-account/mfa-verifications/backup-codes/generate', {
    method: 'POST',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'BACKUP_CODES_FAILED', 'backup-gen');

  // Audit (best-effort — failure must not break the main action)
  try {
    const { audit } = await import('../audit');
    const _token = await getTokenForServerAction();
    const _intro = await introspectToken(_token);
    await audit({ actor: _intro.sub ?? 'unknown', action: 'mfa.backup_codes.generate' });
  } catch { /* audit is best-effort; never surface to caller */ }

  return res.json();
}

/**
 * Gets the user's backup codes.
 * @param identityVerificationRecordId - Verification record for identity.
 * @returns Object containing the backup codes with their used status.
 */
export async function getBackupCodes(
  identityVerificationRecordId: string
): Promise<{ codes: Array<{ code: string; usedAt: string | null }> }> {
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const res = await makeRequest('/api/my-account/mfa-verifications/backup-codes', {
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'BACKUP_CODES_FAILED', 'backup-get');

  return res.json();
}
