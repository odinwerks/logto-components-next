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

import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS } from '../constants';

// In-flight lock to prevent concurrent backup codes generation races
const backupCodesGenerationLocks = new Map<string, Promise<void>>();
const MAX_LOCK_ENTRIES = 1000; // Prevent unbounded growth

const totpGenerationCooldowns = new Map<string, number>();
const MAX_COOLDOWN_ENTRIES = 1000;

export async function clearTotpCooldownsForTesting(): Promise<void> {
  totpGenerationCooldowns.clear();
}

export async function getTotpCooldownsSizeForTesting(): Promise<number> {
  return totpGenerationCooldowns.size;
}

export async function setTotpCooldownForTesting(userId: string, timestamp: number): Promise<void> {
  totpGenerationCooldowns.set(userId, timestamp);
}

export async function hasTotpCooldownForTesting(userId: string): Promise<boolean> {
  return totpGenerationCooldowns.has(userId);
}

export async function getBackupCodesLocksSizeForTesting(): Promise<number> {
  return backupCodesGenerationLocks.size;
}

export async function clearBackupCodesLocksForTesting(): Promise<void> {
  backupCodesGenerationLocks.clear();
}

export async function setBackupCodesLockForTesting(userId: string, promise: Promise<void>): Promise<void> {
  backupCodesGenerationLocks.set(userId, promise);
}

export async function hasBackupCodesLockForTesting(userId: string): Promise<boolean> {
  return backupCodesGenerationLocks.has(userId);
}

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
    assertSafeLogtoId(userId);

    const now = Date.now();

    // To prevent unbounded Map growth, execute a lazy-on-write cleanup during request check:
    if (totpGenerationCooldowns.size >= MAX_COOLDOWN_ENTRIES) {
      for (const [key, timestamp] of totpGenerationCooldowns.entries()) {
        if (now >= timestamp + 10000) {
          totpGenerationCooldowns.delete(key);
        }
      }
      if (totpGenerationCooldowns.size >= MAX_COOLDOWN_ENTRIES) {
        totpGenerationCooldowns.clear();
      }
    }

    const lastRequestTime = totpGenerationCooldowns.get(userId);
    if (lastRequestTime !== undefined && now < lastRequestTime + 10000) {
      throw plainCode('MFA_ENROLL_FAILED');
    }

    // Set cooldown to the current timestamp
    totpGenerationCooldowns.set(userId, now);

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
    assertMfaType(verification.type);
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
    }

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
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(verificationId, 'verificationId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
    }

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
    assertSafeLogtoId(userId);

    // Retrieve existing lock
    const existingLock = backupCodesGenerationLocks.get(userId);

    // Prevent unbounded growth
    while (backupCodesGenerationLocks.size >= MAX_LOCK_ENTRIES) {
      const oldestKey = backupCodesGenerationLocks.keys().next().value;
      if (oldestKey !== undefined) {
        backupCodesGenerationLocks.delete(oldestKey);
      } else {
        break;
      }
    }

    // Create a new lock for this user
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    backupCodesGenerationLocks.set(userId, lockPromise);

    try {
      if (existingLock) {
        await existingLock.catch(() => {}); // absorb failures
      }

      // ── Staleness check (defense in depth) ────────────────────────────────
      if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
        throw new Error('VERIFICATION_EXPIRED');
      }

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
      try {
        const { audit } = await import('../audit');
        const _token = await getTokenForServerAction();
        const _intro = await introspectToken(_token);
        await audit({ actor: _intro.sub ?? 'unknown', action: 'mfa.backup_codes.generate' });
      } catch { /* audit is best-effort; never surface to caller */ }

      return { codes };
    } finally {
      if (backupCodesGenerationLocks.get(userId) === lockPromise) {
        backupCodesGenerationLocks.delete(userId);
      }
      releaseLock!();
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
    if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
    }

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
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
    }

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
