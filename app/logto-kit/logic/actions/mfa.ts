'use server';

import type { MfaVerification, MfaVerificationPayload } from '../types';
import { makeRequest } from './request';
import { throwOnApiError } from './shared';

/**
 * Gets the user's MFA verifications.
 * @returns Array of MFA verifications.
 */
export async function getMfaVerifications(): Promise<MfaVerification[]> {
  const res = await makeRequest('/api/my-account/mfa-verifications');
  
  await throwOnApiError(res, 'Get MFA verifications failed');

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
  
  await throwOnApiError(res, 'Generate TOTP secret failed');

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
  const { type, payload } = verification;
  const res = await makeRequest('/api/my-account/mfa-verifications', {
    method: 'POST',
    body: { type, ...payload },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'Add MFA verification failed');
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
  const res = await makeRequest(`/api/my-account/mfa-verifications/${verificationId}`, {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'Delete MFA verification failed');
}

/**
 * Generates new backup codes.
 * @param identityVerificationRecordId - Verification record for identity.
 * @returns Object containing the backup codes.
 */
export async function generateBackupCodes(identityVerificationRecordId: string): Promise<{ codes: string[] }> {
  const res = await makeRequest('/api/my-account/mfa-verifications/backup-codes/generate', {
    method: 'POST',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'Generate backup codes failed');

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
  const res = await makeRequest('/api/my-account/mfa-verifications/backup-codes', {
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'Get backup codes failed');

  return res.json();
}
