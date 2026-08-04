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

// The 70-second lease covers at most 45 seconds of normal rotation work,
// 5 seconds of first-pass compensation, 8 seconds of final reconciliation,
// and the lock manager's 1-second ownership-safe release. Thus every path has
// an 11-second margin and remains below the action's 60-second request budget.
const BACKUP_CODES_ROTATION_DEADLINE_MS = 45_000;
const BACKUP_CODES_COMPENSATION_BUDGET_MS = 5_000;
const BACKUP_CODES_RECONCILIATION_BUDGET_MS = 8_000;
const BACKUP_CODES_LOCK_LEASE_MS = 70_000;

// In-flight lock to prevent concurrent backup codes generation races.
// Residual window: a broken transport/event loop that fails to settle after
// AbortSignal fires can still outlive any finite Redis lease. The action fails
// closed and audits ambiguity, but exclusivity cannot be extended indefinitely.
const backupCodesLockManager = createLockManager('mfa-backup-codes', {
  leaseDurationMs: BACKUP_CODES_LOCK_LEASE_MS,
});

async function withinBackupCodesLockBudget<T>(
  signal: AbortSignal,
  operation: () => Promise<T>,
): Promise<T> {
  if (signal.aborted) throw plainCode('BACKUP_CODES_FAILED');

  // Do not separately race the operation against the deadline. Requests receive
  // this same signal and therefore settle through fetch's real abort behavior;
  // the aborted flag also prevents a response racing the deadline from being
  // treated as success while the per-user lock is still held.
  let aborted = false;
  const onAbort = () => { aborted = true; };
  signal.addEventListener('abort', onAbort, { once: true });

  try {
    const result = await operation();
    if (aborted || signal.aborted) throw plainCode('BACKUP_CODES_FAILED');
    return result;
  } catch (err) {
    if (aborted || signal.aborted) throw plainCode('BACKUP_CODES_FAILED');
    throw err;
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

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
    const intro = await introspectToken(token, { assertAudience: true });
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
    const intro = await introspectToken(token, { assertAudience: true });
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
    const intro = await introspectToken(token, { assertAudience: true });
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
    const intro = await introspectToken(token, { assertAudience: true });
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
    const rotationSignal = AbortSignal.timeout(BACKUP_CODES_ROTATION_DEADLINE_MS);

    try {

      // ── Staleness check (defense in depth) ────────────────────────────────
      // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie.
      await withinBackupCodesLockBudget(
        rotationSignal,
        () => requireVerifiedIdentity(identityVerificationRecordId),
      );

      // Step 1: List existing backup-code factors (read-only). We capture the
      // list up front so we know what to invalidate later, but we DO NOT delete
      // them yet — deleting is deferred until after a successful enrollment so
      // a failed enroll never leaves the user with zero backup codes (BUG-L04).
      const listRes = await withinBackupCodesLockBudget(
        rotationSignal,
        () => makeRequest('/api/my-account/mfa-verifications', {
          extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
          signal: rotationSignal,
        }),
      );

      await withinBackupCodesLockBudget(
        rotationSignal,
        () => throwOnApiError(listRes, 'BACKUP_CODES_FAILED', 'backup-list'),
      );

      const listData = await withinBackupCodesLockBudget(rotationSignal, () => listRes.json());
      const verifications: MfaVerification[] = Array.isArray(listData)
        ? listData
        : Array.isArray(listData?.verifications)
          ? listData.verifications
          : Array.isArray(listData?.data)
            ? listData.data
            : [];

      const existingBackupFactors = verifications.filter(verification => verification.type === 'BackupCode');
      const oldFactorIds = new Set(existingBackupFactors.map(factor => factor.id));

      const listBackupFactors = async (
        signal: AbortSignal,
        auditAction: string,
      ): Promise<MfaVerification[]> => {
        const response = await withinBackupCodesLockBudget(
          signal,
          () => makeRequest('/api/my-account/mfa-verifications', {
            extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
            signal,
          }),
        );
        await withinBackupCodesLockBudget(
          signal,
          () => throwOnApiError(response, 'BACKUP_CODES_FAILED', auditAction),
        );
        const data = await withinBackupCodesLockBudget(signal, () => response.json());
        const currentVerifications: MfaVerification[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.verifications)
            ? data.verifications
            : Array.isArray(data?.data)
              ? data.data
              : [];
        return currentVerifications.filter(factor => factor.type === 'BackupCode');
      };

      const deleteBackupFactors = async (
        factors: MfaVerification[],
        signal: AbortSignal,
        auditAction: string,
      ): Promise<void> => {
        if (signal.aborted) throw plainCode('BACKUP_CODES_FAILED');

        for (const factor of factors) {
          const removeRes = await withinBackupCodesLockBudget(
            signal,
            () => makeRequest(`/api/my-account/mfa-verifications/${encodeURIComponent(factor.id)}`, {
              method: 'DELETE',
              extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
              signal,
            }),
          );
          if (removeRes.status !== 404) {
            await withinBackupCodesLockBudget(
              signal,
              () => throwOnApiError(removeRes, 'BACKUP_CODES_FAILED', auditAction),
            );
          }
        }
      };

      // Invalidate every previously-listed backup-code factor. Used as a
      // deferred cleanup AFTER a successful enroll, or as the compensation
      // step when Logto rejects concurrent BackupCode factors (409/422).
      const deleteOldBackupFactors = async (signal: AbortSignal): Promise<void> => {
        await deleteBackupFactors(existingBackupFactors, signal, 'backup-remove-old');
      };

      // If enrollment loses its response (including a local abort), Logto may
      // still have committed. Re-list factors and remove only newly-created
      // BackupCode factors, preserving the known old factors and their codes.
      const compensateAmbiguousEnrollment = async (signal: AbortSignal): Promise<void> => {
        const currentBackupFactors = await listBackupFactors(signal, 'backup-reconcile-enroll');
        const unexpectedFactors = currentBackupFactors.filter(factor => !oldFactorIds.has(factor.id));
        await deleteBackupFactors(
          unexpectedFactors,
          signal,
          'backup-remove-ambiguous-enroll',
        );
      };

      const rollbackStateIsSettled = (factors: MfaVerification[]): boolean => {
        const currentFactorIds = new Set(factors.map(factor => factor.id));
        return factors.length === existingBackupFactors.length &&
          currentFactorIds.size === oldFactorIds.size &&
          [...oldFactorIds].every(id => currentFactorIds.has(id));
      };

      // This is deliberately separate from the first compensation pass. A
      // remote enrollment may commit after that pass listed factors. The final
      // lock-held read catches it, compensates once, and performs one last
      // authoritative read before the lock can be released.
      const reconcileAmbiguousEnrollment = async (signal: AbortSignal): Promise<boolean> => {
        let currentBackupFactors = await listBackupFactors(signal, 'backup-final-rollback-list');
        if (rollbackStateIsSettled(currentBackupFactors)) return true;

        const unexpectedFactors = currentBackupFactors.filter(factor => !oldFactorIds.has(factor.id));
        await deleteBackupFactors(
          unexpectedFactors,
          signal,
          'backup-final-rollback-compensate',
        );
        currentBackupFactors = await listBackupFactors(signal, 'backup-final-rollback-confirm');
        return rollbackStateIsSettled(currentBackupFactors);
      };

      const failAmbiguousEnrollment = async (cause: unknown): Promise<never> => {
        auditSafe(userId, 'mfa.backup_codes.rotation_ambiguous', undefined, {
          stage: 'enroll',
          oldFactorCount: existingBackupFactors.length,
          deadlineExceeded: rotationSignal.aborted,
        });
        warn('[generateBackupCodes] Enrollment response was not confirmed; failing closed.');

        const cleanupSignal = AbortSignal.timeout(BACKUP_CODES_COMPENSATION_BUDGET_MS);
        try {
          await compensateAmbiguousEnrollment(cleanupSignal);
        } catch (cleanupErr) {
          warn('[generateBackupCodes] Enrollment compensation failed:', cleanupErr);
        }

        const reconciliationSignal = AbortSignal.timeout(BACKUP_CODES_RECONCILIATION_BUDGET_MS);
        let rollbackSettled = false;
        try {
          rollbackSettled = await reconcileAmbiguousEnrollment(reconciliationSignal);
        } catch (reconciliationErr) {
          warn('[generateBackupCodes] Final enrollment reconciliation failed:', reconciliationErr);
        }
        if (!rollbackSettled) {
          auditSafe(userId, 'mfa.backup_codes.rotation_divergence', undefined, {
            stage: 'final-rollback',
            oldFactorCount: existingBackupFactors.length,
          });
        }

        throw plainCode('BACKUP_CODES_FAILED', cause);
      };

      // A successful rotation has exactly one BackupCode factor, it is not one
      // of the old factor IDs, and (when the provider returned an ID) it is the
      // factor created by this enrollment. Old or duplicate factors are
      // compensated once and then re-read; uncertainty never becomes success.
      const reconcileSuccessfulEnrollment = async (
        signal: AbortSignal,
        providerEnrolledFactorId?: string,
      ): Promise<boolean> => {
        let currentBackupFactors = await listBackupFactors(signal, 'backup-final-list');
        let intendedFactorId = providerEnrolledFactorId;
        const newFactors = currentBackupFactors.filter(factor => !oldFactorIds.has(factor.id));
        if (!intendedFactorId && newFactors.length === 1) {
          intendedFactorId = newFactors[0]?.id;
        }

        const isIntendedState = (factors: MfaVerification[]): boolean =>
          intendedFactorId !== undefined &&
          factors.length === 1 &&
          factors[0]?.id === intendedFactorId &&
          !oldFactorIds.has(intendedFactorId);

        if (isIntendedState(currentBackupFactors)) return true;

        // If the intended factor can be identified, remove every old/duplicate
        // BackupCode factor. Without an identifiable intended factor, only old
        // factors are safe to remove; duplicate unknown factors remain a
        // fail-closed divergence rather than deleting arbitrary recovery data.
        const inconsistentFactors = intendedFactorId
          ? currentBackupFactors.filter(factor => factor.id !== intendedFactorId)
          : currentBackupFactors.filter(factor => oldFactorIds.has(factor.id));
        await deleteBackupFactors(
          inconsistentFactors,
          signal,
          'backup-final-compensate',
        );
        currentBackupFactors = await listBackupFactors(signal, 'backup-final-confirm');
        if (!intendedFactorId) {
          const finalNewFactors = currentBackupFactors.filter(factor => !oldFactorIds.has(factor.id));
          if (finalNewFactors.length === 1) intendedFactorId = finalNewFactors[0]?.id;
        }
        return isIntendedState(currentBackupFactors);
      };

      // Step 2: Generate new codes (no verification header needed)
      const genRes = await withinBackupCodesLockBudget(
        rotationSignal,
        () => makeRequest('/api/my-account/mfa-verifications/backup-codes/generate', {
          method: 'POST',
          signal: rotationSignal,
        }),
      );

      await withinBackupCodesLockBudget(
        rotationSignal,
        () => throwOnApiError(genRes, 'BACKUP_CODES_FAILED', 'backup-gen'),
      );

      const { codes } = await withinBackupCodesLockBudget(rotationSignal, () => genRes.json());

      // Step 3: Enroll/bind codes to the account. We enroll WITHOUT first
      // deleting the old factors, so a failure here leaves the user's existing
      // backup codes intact (BUG-L04). If Logto does not permit multiple
      // concurrent BackupCode factors, the enroll is rejected with 409/422.
      // Enrollment is non-idempotent. Use the explicit 45-second rotation
      // signal so makeRequest cannot substitute its shorter 15-second default
      // and 14 seconds remain for compensation, reconciliation, and release.
      // A rejected fetch is commit-ambiguous and must be reconciled before unlock.
      if (rotationSignal.aborted) throw plainCode('BACKUP_CODES_FAILED');
      let enrollRes: Response;
      try {
        enrollRes = await makeRequest('/api/my-account/mfa-verifications', {
          method: 'POST',
          body: { type: 'BackupCode', codes },
          extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
          signal: rotationSignal,
        });
      } catch (enrollErr) {
        return failAmbiguousEnrollment(enrollErr);
      }

      if (
        !enrollRes.ok &&
        (enrollRes.status === 409 || enrollRes.status === 422) &&
        existingBackupFactors.length > 0
      ) {
        // CAN-ACT-005: The enrollment was rejected because a BackupCode factor
        // already exists (singleton enforcement). A blind retry of the identical
        // body + header CANNOT succeed — no factor-state change occurred between
        // the first attempt and a retry would (the old factors are intentionally
        // NOT deleted before enrolling, per the BUG-L04 invariant). We do NOT
        // delete-then-enroll either: a failure on the enroll step after deleting
        // would leave the user with ZERO backup-code recovery factors.
        //
        // Remediation: fail safely with a clear error, retaining the user's
        // existing backup codes, until the provider offers a documented atomic
        // replacement operation. The user must remove existing backup codes
        // first, then generate new ones.
        warn(
          `[generateBackupCodes] Enrollment rejected with ${enrollRes.status} ` +
            '(existing BackupCode factor — singleton conflict). ' +
            'A blind retry cannot succeed (no state change); failing safely ' +
            'with old codes retained.'
        );
        throw plainCode('BACKUP_CODES_SINGLETON_CONFLICT');
      }

      if (
        !enrollRes.ok &&
        enrollRes.status !== 409 &&
        enrollRes.status !== 422
      ) {
        // A resolved non-success response is still commit-ambiguous: Logto may
        // have persisted the factor before returning (for example) a 5xx. Keep
        // throwOnApiError's sanitization contract, but settle remote state under
        // the lock before surfacing that sanitized failure.
        let enrollErr: unknown;
        try {
          await throwOnApiError(enrollRes, 'BACKUP_CODES_FAILED', 'backup-enroll');
        } catch (error) {
          enrollErr = error;
        }
        await failAmbiguousEnrollment(enrollErr);
      }

      await throwOnApiError(enrollRes, 'BACKUP_CODES_FAILED', 'backup-enroll');

      let providerEnrolledFactorId: string | undefined;
      if (typeof enrollRes.clone === 'function') {
        try {
          const enrollData = await withinBackupCodesLockBudget(
            rotationSignal,
            () => enrollRes.clone().json(),
          ) as { id?: unknown };
          if (typeof enrollData?.id === 'string' && enrollData.id.length > 0) {
            providerEnrolledFactorId = enrollData.id;
          }
        } catch {
          // A 204/empty enrollment response is valid. Final factor-state
          // reconciliation can identify a sole non-old factor instead.
        }
      }

      // Step 4: New codes are now bound — invalidate the old ones. Once enroll
      // commits, an unsettled DELETE is an ambiguous security state: returning
      // the codes as success could overlap another rotation with a late remote
      // commit. Fail closed, audit the ambiguity, and retry cleanup under a
      // fresh bounded signal while retaining the lock through settlement.
      try {
        await deleteOldBackupFactors(rotationSignal);
      } catch {
        auditSafe(userId, 'mfa.backup_codes.rotation_ambiguous', undefined, {
          stage: 'delete-old',
          oldFactorCount: existingBackupFactors.length,
          deadlineExceeded: rotationSignal.aborted,
        });
        warn('[generateBackupCodes] Old-factor deletion was not confirmed settled; failing closed.');

        const cleanupSignal = AbortSignal.timeout(BACKUP_CODES_COMPENSATION_BUDGET_MS);
        try {
          await deleteOldBackupFactors(cleanupSignal);
        } catch (cleanupErr) {
          warn('[generateBackupCodes] Compensation cleanup failed:', cleanupErr);
        }
      }

      // Final lock-held reconciliation is mandatory on every success path,
      // including after cleanup compensation. Only the authoritative intended
      // state permits the new codes to leave the server.
      const reconciliationSignal = AbortSignal.timeout(BACKUP_CODES_RECONCILIATION_BUDGET_MS);
      let rotationSettled = false;
      try {
        rotationSettled = await reconcileSuccessfulEnrollment(
          reconciliationSignal,
          providerEnrolledFactorId,
        );
      } catch (reconciliationErr) {
        warn('[generateBackupCodes] Final rotation reconciliation failed:', reconciliationErr);
      }
      if (!rotationSettled) {
        auditSafe(userId, 'mfa.backup_codes.rotation_divergence', undefined, {
          stage: 'final-success',
          oldFactorCount: existingBackupFactors.length,
        });
        throw plainCode('BACKUP_CODES_FAILED');
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
    const intro = await introspectToken(token, { assertAudience: true });
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
