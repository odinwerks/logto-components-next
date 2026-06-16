'use server';

import type { MfaVerification, MfaVerificationPayload } from '../types';
import { assertSafeLogtoId, assertMfaType } from '../guards';
import { makeRequest } from './request';
import { throwOnApiError, plainCode } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import { safeAction, type ActionResult, type DataResult } from './safe';
import { ValidationError } from '../validation';
import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../config';

import { assertVerificationNotExpired, auditSafe } from './helpers';
import { createLockManager, createRateLimiter } from '../../../lib/distributed-state';

// In-flight lock to prevent concurrent backup codes generation races
const backupCodesLockManager = createLockManager('mfa-backup-codes');

// Rate limiter for TOTP secret generation (1 request per 10s per user)
const totpGenerationRateLimiter = createRateLimiter({
  name: 'mfa-totp-cooldown',
  windowMs: 10_000,
  max: 1,
});

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
    // Rate limit check
    const { claims, isAuthenticated } = await getLogtoContext(getLogtoConfig());
    if (!isAuthenticated || !claims?.sub) {
      throw new Error('Cannot determine user ID for TOTP secret generation');
    }
    const userId = claims.sub;
    assertSafeLogtoId(userId, 'userId');

    // Rate limit check (1 request per 10s per user)
    if (!(await totpGenerationRateLimiter.check(userId))) {
      throw plainCode('MFA_ENROLL_FAILED');
    }

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
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    const token = await getTokenForServerAction();
    const intro = await introspectToken(token);
    if (!intro.active || !intro.sub) throw new Error('UNAUTHORIZED');
    const userId = intro.sub;

    assertMfaType(verification.type);
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    assertVerificationNotExpired(verificationTimestamp);

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

    // Build request body explicitly per MFA type to avoid leaking unknown fields
    // from index-signature payloads (WebAuthn, BackupCode).
    let body: Record<string, unknown>;
    if (type === 'Totp') {
      body = { type, code: payload.code, secret: payload.secret };
    } else if (type === 'BackupCode') {
      const bcPayload = payload as Record<string, unknown>;
      body = { type };
      if (bcPayload.codes !== undefined) body.codes = bcPayload.codes;
    } else {
      // WebAuthn: only forward known fields, not the entire index-signature payload
      const waPayload = payload as Record<string, unknown>;
      body = { type };
      if (waPayload.newIdentifierVerificationRecordId !== undefined) {
        body.newIdentifierVerificationRecordId = waPayload.newIdentifierVerificationRecordId;
      }
      // Forward standard WebAuthn credential fields (from browser WebAuthn API)
      if (waPayload.id !== undefined) body.id = waPayload.id;
      if (waPayload.rawId !== undefined) body.rawId = waPayload.rawId;
      if (waPayload.response !== undefined) body.response = waPayload.response;
      if (waPayload.authenticatorAttachment !== undefined) body.authenticatorAttachment = waPayload.authenticatorAttachment;
      if (waPayload.clientExtensionResults !== undefined) body.clientExtensionResults = waPayload.clientExtensionResults;
    }

    const res = await makeRequest('/api/my-account/mfa-verifications', {
      method: 'POST',
      body,
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    
    await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'mfa-add');

    // Audit (best-effort - failure must not break the main action)
    auditSafe(userId, `mfa.${verification.type.toLowerCase()}.enroll`);
  });
}

/**
 * Deletes an MFA verification.
 * @param verificationId - The ID of the verification to delete.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function deleteMfaVerification(
  verificationId: string,
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    const token = await getTokenForServerAction();
    const intro = await introspectToken(token);
    if (!intro.active || !intro.sub) throw new Error('UNAUTHORIZED');
    const userId = intro.sub;

    assertSafeLogtoId(verificationId, 'verificationId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    assertVerificationNotExpired(verificationTimestamp);

    const res = await makeRequest(`/api/my-account/mfa-verifications/${encodeURIComponent(verificationId)}`, {
      method: 'DELETE',
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    
    await throwOnApiError(res, 'MFA_REMOVE_FAILED', 'mfa-remove');

    // Audit (best-effort - failure must not break the main action)
    auditSafe(userId, 'mfa.remove', verificationId);
  });
}

/**
 * Generates new backup codes.
 * @param identityVerificationRecordId - Verification record for identity.
 * @returns Object containing the backup codes.
 */
export async function generateBackupCodes(
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<DataResult<{ codes: string[] }>> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // Get user ID for per-user locking
    const { claims, isAuthenticated } = await getLogtoContext(getLogtoConfig());
    if (!isAuthenticated || !claims?.sub) {
      throw new Error('Cannot determine user ID for backup codes generation');
    }
    const userId = claims.sub;
    assertSafeLogtoId(userId, 'userId');

    const releaseLock = await backupCodesLockManager.acquire(userId);

    try {

      // ── Staleness check (defense in depth) ────────────────────────────────
      assertVerificationNotExpired(verificationTimestamp);

      // Step 1: Remove existing backup-code factors so old codes are invalidated.
      const listRes = await makeRequest('/api/my-account/mfa-verifications', {
        extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
      });

      await throwOnApiError(listRes, 'BACKUP_CODES_FAILED', 'backup-list');

      const listData = await listRes.json();
      const verifications: MfaVerification[] = Array.isArray(listData)
        ? listData
        : Array.isArray(listData?.verifications)
          ? listData.verifications
          : Array.isArray(listData?.data)
            ? listData.data
            : [];

      const existingBackupFactors = verifications.filter(verification => verification.type === 'BackupCode');

      for (const factor of existingBackupFactors) {
        const removeRes = await makeRequest(`/api/my-account/mfa-verifications/${encodeURIComponent(factor.id)}`, {
          method: 'DELETE',
          extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
        });

        await throwOnApiError(removeRes, 'BACKUP_CODES_FAILED', 'backup-remove-old');
      }

      // Step 2: Generate codes (no verification header needed)
      const genRes = await makeRequest('/api/my-account/mfa-verifications/backup-codes/generate', {
        method: 'POST',
      });

      await throwOnApiError(genRes, 'BACKUP_CODES_FAILED', 'backup-gen');

      const { codes } = await genRes.json();

      // Step 3: Enroll/bind codes to the account.
      const enrollRes = await makeRequest('/api/my-account/mfa-verifications', {
        method: 'POST',
        body: { type: 'BackupCode', codes },
        extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
      });

      await throwOnApiError(enrollRes, 'BACKUP_CODES_FAILED', 'backup-enroll');

      // Audit (best-effort - failure must not break the main action)
      auditSafe(userId, 'mfa.backup_codes.generate');

      return { codes };
    } finally {
      releaseLock();
    }
  });
}

/**
 * Gets the user's backup codes.
 * @param identityVerificationRecordId - Verification record for identity.
 * @returns Object containing the backup codes with their used status.
 */
export async function getBackupCodes(
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<DataResult<{ codes: Array<{ code: string; usedAt: string | null }> }>> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    assertVerificationNotExpired(verificationTimestamp);

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
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    const token = await getTokenForServerAction();
    const intro = await introspectToken(token);
    if (!intro.active || !intro.sub) throw new Error('UNAUTHORIZED');
    const userId = intro.sub;

    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    assertVerificationNotExpired(verificationTimestamp);

    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      throw new ValidationError('INVALID_INPUT', 'verification.code');
    }
    if (typeof secret !== 'string' || secret.length === 0 || secret.length > 64) {
      throw new ValidationError('INVALID_INPUT', 'verification.secret');
    }

    const res = await makeRequest('/api/my-account/mfa-verifications/totp', {
      method: 'PUT',
      body: { secret, code },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });

    await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'totp-replace');

    // Audit (best-effort - failure must not break the main action)
    auditSafe(userId, 'mfa.totp.replace');
  });
}
