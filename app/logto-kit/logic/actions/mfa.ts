'use server';

import type { MfaVerification, MfaVerificationPayload } from '../types';
import { assertSafeLogtoId, assertMfaType } from '../guards';
import { makeRequest } from './request';
import { throwOnApiError, plainCode } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import { warn, logEvent } from '../log';
import { safeAction, type ActionResult, type DataResult } from './safe';
import { ValidationError } from '../validation';

import { auditSafe } from './helpers';
import { requireVerifiedIdentity } from './verification-cookie';
import { createLockManager, createRateLimiter } from '../../../lib/distributed-state';
import { LOG_EVENTS } from '../../../lib/log-events';

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
    // ── Explicit auth check ───────────────────────────────────────────────
    const token = await getTokenForServerAction();
    const intro = await introspectToken(token);
    if (!intro.active || !intro.sub) throw plainCode('UNAUTHENTICATED');

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
    // ── Explicit auth check (live token introspection) ──────────────────
    const token = await getTokenForServerAction();
    const intro = await introspectToken(token);
    if (!intro.active || !intro.sub) {
      throw plainCode('UNAUTHENTICATED');
    }
    const userId = intro.sub;
    assertSafeLogtoId(userId, 'userId');

    // Rate limit check (1 request per 10s per user)
    if (!(await totpGenerationRateLimiter.check(userId))) {
      throw plainCode('MFA_ENROLL_FAILED');
    }

    // BUG-057: If the downstream makeRequest/throwOnApiError fails, reset the
    // rate-limit token so a transient Logto error does not leave the user
    // rate-limited for 10s with no secret produced.
    try {
      const res = await makeRequest('/api/my-account/mfa-verifications/totp-secret/generate', {
        method: 'POST',
      });

      await throwOnApiError(res, 'MFA_ENROLL_FAILED', 'totp-secret');

      return res.json();
    } catch (err) {
      await totpGenerationRateLimiter.reset(userId).catch(() => {});
      throw err;
    }
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
): Promise<ActionResult> {
  return safeAction(async () => {
    const token = await getTokenForServerAction();
    const intro = await introspectToken(token);
    if (!intro.active || !intro.sub) throw plainCode('UNAUTHENTICATED');
    const userId = intro.sub;

    assertMfaType(verification.type);
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie
    // (set by verifyPasswordForIdentity), not a client-supplied timestamp.
    await requireVerifiedIdentity(identityVerificationRecordId);

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
    } else if (type === 'BackupCode') {
      // BUG-055: Validate BackupCode codes before sending to Logto API.
      // Backup codes are alphanumeric strings (4–50 chars). The array must
      // be non-empty and capped at 20 entries to reject oversized payloads.
      const bcPayload = payload as Record<string, unknown>;
      if (bcPayload.codes !== undefined) {
        if (!Array.isArray(bcPayload.codes) || bcPayload.codes.length === 0 || bcPayload.codes.length > 20) {
          throw new ValidationError('INVALID_INPUT', 'verification.codes');
        }
        for (const code of bcPayload.codes) {
          if (typeof code !== 'string' || code.length < 4 || code.length > 50 || !/^[A-Za-z0-9]+$/.test(code)) {
            throw new ValidationError('INVALID_INPUT', 'verification.codes');
          }
        }
      }
    } else {
      // WebAuthn
      const waPayload = payload as Record<string, unknown>;

      // BUG-055: Validate WebAuthn credential ID format before sending to Logto.
      // WebAuthn credential IDs are base64url-encoded byte arrays (1–512 chars,
      // characters limited to A-Z a-z 0-9 - _).
      if (waPayload.id !== undefined) {
        if (
          typeof waPayload.id !== 'string' ||
          waPayload.id.length === 0 ||
          waPayload.id.length > 512 ||
          !/^[A-Za-z0-9_-]+$/.test(waPayload.id)
        ) {
          throw new ValidationError('INVALID_INPUT', 'verification.id');
        }
      }
      if (waPayload.rawId !== undefined) {
        if (
          typeof waPayload.rawId !== 'string' ||
          waPayload.rawId.length === 0 ||
          waPayload.rawId.length > 512 ||
          !/^[A-Za-z0-9_-]+$/.test(waPayload.rawId)
        ) {
          throw new ValidationError('INVALID_INPUT', 'verification.rawId');
        }
      }

      if (
        typeof waPayload.newIdentifierVerificationRecordId === 'string' &&
        waPayload.newIdentifierVerificationRecordId.length > 128
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
    logEvent.info(LOG_EVENTS.MFA_ENROLL, 'MFA verification enrolled', { type: verification.type });
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
): Promise<ActionResult> {
  return safeAction(async () => {
    const token = await getTokenForServerAction();
    const intro = await introspectToken(token);
    if (!intro.active || !intro.sub) throw plainCode('UNAUTHENTICATED');
    const userId = intro.sub;

    assertSafeLogtoId(verificationId, 'verificationId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie.
    await requireVerifiedIdentity(identityVerificationRecordId);

    const res = await makeRequest(`/api/my-account/mfa-verifications/${encodeURIComponent(verificationId)}`, {
      method: 'DELETE',
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    
    await throwOnApiError(res, 'MFA_REMOVE_FAILED', 'mfa-remove');

    // Audit (best-effort - failure must not break the main action)
    auditSafe(userId, 'mfa.remove', verificationId);
    logEvent.info(LOG_EVENTS.MFA_REMOVE, 'MFA verification removed', { verificationId });
  });
}

/**
 * Generates new backup codes.
 * @param identityVerificationRecordId - Verification record for identity.
 * @returns Object containing the backup codes.
 */
export async function generateBackupCodes(
  identityVerificationRecordId: string,
): Promise<DataResult<{ codes: string[] }>> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Explicit auth check (stronger than getLogtoContext) ────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }
    const userId = introspection.sub;
    assertSafeLogtoId(userId, 'userId');

    const releaseLock = await backupCodesLockManager.acquire(userId);

    try {

      // ── Staleness check (defense in depth) ────────────────────────────────
      // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie.
      await requireVerifiedIdentity(identityVerificationRecordId);

      // Step 1: List existing backup-code factors (read-only). We capture the
      // list up front so we know what to invalidate later, but we DO NOT delete
      // them yet — deleting is deferred until after a successful enrollment so
      // a failed enroll never leaves the user with zero backup codes (BUG-L04).
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

      // Invalidate every previously-listed backup-code factor. Used as a
      // deferred cleanup AFTER a successful enroll, or as the compensation
      // step when Logto rejects concurrent BackupCode factors (409/422).
      const deleteOldBackupFactors = async (): Promise<void> => {
        for (const factor of existingBackupFactors) {
          const removeRes = await makeRequest(`/api/my-account/mfa-verifications/${encodeURIComponent(factor.id)}`, {
            method: 'DELETE',
            extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
          });

          await throwOnApiError(removeRes, 'BACKUP_CODES_FAILED', 'backup-remove-old');
        }
      };

      // Step 2: Generate new codes (no verification header needed)
      const genRes = await makeRequest('/api/my-account/mfa-verifications/backup-codes/generate', {
        method: 'POST',
      });

      await throwOnApiError(genRes, 'BACKUP_CODES_FAILED', 'backup-gen');

      const { codes } = await genRes.json();

      // Step 3: Enroll/bind codes to the account. We enroll WITHOUT first
      // deleting the old factors, so a failure here leaves the user's existing
      // backup codes intact (BUG-L04). If Logto does not permit multiple
      // concurrent BackupCode factors, the enroll is rejected with 409/422 —
      // in that case we retry the enrollment first, and only delete the old
      // factors once the retry succeeds (BUG-015).
      const enrollRes = await makeRequest('/api/my-account/mfa-verifications', {
        method: 'POST',
        body: { type: 'BackupCode', codes },
        extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
      });

      if (
        !enrollRes.ok &&
        (enrollRes.status === 409 || enrollRes.status === 422) &&
        existingBackupFactors.length > 0
      ) {
        warn(
          `[generateBackupCodes] Enrollment rejected with ${enrollRes.status} ` +
            '(concurrent BackupCode factor not permitted); retrying enrollment, then deleting old factors.'
        );
        // BUG-015: Retry enrollment FIRST (with the original codes). Only delete
        // old factors AFTER the retry succeeds. Previously deletion ran BEFORE
        // the retry, so a transient 5xx on the retry left the user with zero
        // backup-code recovery factors (violating BUG-L04).
        const retryRes = await makeRequest('/api/my-account/mfa-verifications', {
          method: 'POST',
          body: { type: 'BackupCode', codes },
          extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
        });

        await throwOnApiError(retryRes, 'BACKUP_CODES_FAILED', 'backup-enroll-retry');

        // Only delete old factors AFTER retry succeeds (best-effort: a cleanup
        // failure must not prevent returning the newly-bound codes — BUG-056).
        try {
          await deleteOldBackupFactors();
        } catch {
          // Best-effort cleanup; new codes are bound and will be returned.
        }
      } else {
        await throwOnApiError(enrollRes, 'BACKUP_CODES_FAILED', 'backup-enroll');

        // Step 4: New codes are now bound — invalidate the old ones so they can
        // no longer be used. This only runs after a successful enrollment, so a
        // failure above never reaches here (old codes stay intact).
        // BUG-056: Best-effort cleanup — if deletion throws, the new codes are
        // still bound; returning them must not be blocked by a cleanup failure
        // (otherwise the user is left with orphaned bound codes never displayed).
        try {
          await deleteOldBackupFactors();
        } catch {
          // Best-effort cleanup; new codes are bound and will be returned.
        }
      }

      // Audit (best-effort - failure must not break the main action)
      auditSafe(userId, 'mfa.backup_codes.generate');
      logEvent.info(LOG_EVENTS.MFA_BACKUP_CODES_GENERATE, 'Backup codes generated', {});

      return { codes };
    } finally {
      await releaseLock();
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
): Promise<DataResult<{ codes: Array<{ code: string; usedAt: string | null }> }>> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Explicit auth check ─────────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }

    // ── Staleness check (defense in depth) ──────────────────────────────────
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie.
    await requireVerifiedIdentity(identityVerificationRecordId);

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
): Promise<ActionResult> {
  return safeAction(async () => {
    const token = await getTokenForServerAction();
    const intro = await introspectToken(token);
    if (!intro.active || !intro.sub) throw plainCode('UNAUTHENTICATED');
    const userId = intro.sub;

    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie.
    await requireVerifiedIdentity(identityVerificationRecordId);

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
    logEvent.info(LOG_EVENTS.MFA_TOTP_REPLACE, 'TOTP replaced', {});
  });
}
