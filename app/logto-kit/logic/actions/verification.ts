'use server';

import { makeRequest } from './request';
import { throwOnApiError, plainCode } from '../errors';
import {
  assertVerificationType,
  assertVerificationCode,
  assertSafeLogtoId,
} from '../guards';
import { safeAction, type ActionResult, type DataResult } from './safe';
import { ValidationError } from '../validation';
import { assertPhoneCountryAllowed } from '../country-list-filter';
import { getCountryFilter } from '../../config';
import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS } from '../constants';

/**
 * Normalizes phone numbers by stripping whitespace, hyphens, parentheses, etc.
 * Preserves a leading '+' if present for E.164 compliance.
 * Returns only digits if no '+' prefix exists.
 */
function cleanPhoneNumber(phone: string): string {
  if (typeof phone !== 'string') {
    throw new ValidationError('INVALID_INPUT', 'phone');
  }
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

// ============================================================================
// Password Verification
// ============================================================================

export async function verifyPasswordForIdentity(password: string): Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>> {
  return safeAction(async () => {
    // Guard: password must be a non-empty string with reasonable length
    if (typeof password !== 'string' || password.length === 0 || password.length > 256) {
      throw new ValidationError('INVALID_INPUT', 'password');
    }
    // Block control characters (except common whitespace)
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(password)) {
      throw new ValidationError('INVALID_INPUT', 'password');
    }
    const res = await makeRequest('/api/verifications/password', {
      method: 'POST',
      body: { password },
    });
    await throwOnApiError(res, 'VERIFICATION_FAILED', 'password-verify', true);
    const parsed = await res.json();
    if (!parsed.verificationRecordId) {
      throw plainCode('VERIFICATION_FAILED');
    }
    // Store Logto's expiresAt directly (server-authoritative).
    // Previously this computed issued-at ≈ expiresAt - 10min, which hardcoded
    // Logto's TTL. Storing expiresAt itself means the staleness check in
    // account.ts just compares Date.now() > verificationTimestamp - no TTL
    // assumption needed. Fallback: now + 10min if Logto omits expiresAt.
    let verificationTimestamp: number;
    if (parsed.expiresAt !== undefined && parsed.expiresAt !== null) {
      if (typeof parsed.expiresAt === 'number') {
        if (parsed.expiresAt < 10000000000) {
          verificationTimestamp = parsed.expiresAt * 1000;
        } else {
          verificationTimestamp = parsed.expiresAt;
        }
      } else if (typeof parsed.expiresAt === 'string') {
        verificationTimestamp = new Date(parsed.expiresAt).getTime();
      } else {
        verificationTimestamp = new Date(parsed.expiresAt).getTime();
      }
    } else {
      verificationTimestamp = Date.now() + 10 * 60 * 1000;
    }
    return {
      verificationRecordId: parsed.verificationRecordId,
      verificationTimestamp,  // milliseconds; = expiresAt, server-derived
    };
  });
}

// ============================================================================
// Email Verification
// ============================================================================

export async function sendEmailVerificationCode(email: string): Promise<DataResult<{ verificationId: string }>> {
  return safeAction(async () => {
    if (typeof email !== 'string' || email.length === 0 || email.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('INVALID_INPUT', 'email');
    }
    const res = await makeRequest('/api/verifications/verification-code', {
      method: 'POST',
      body: { identifier: { type: 'email', value: email } },
    });
    await throwOnApiError(res, 'VERIFICATION_FAILED', 'email-verify-send', true);
    const parsed = await res.json();
    if (!parsed.verificationRecordId) {
      throw plainCode('VERIFICATION_FAILED');
    }
    return { verificationId: parsed.verificationRecordId };
  });
}

// ============================================================================
// Phone Verification
// ============================================================================

export async function sendPhoneVerificationCode(phone: string): Promise<DataResult<{ verificationId: string }>> {
  return safeAction(async () => {
    const countryFilter = getCountryFilter();
    const cleanedPhone = cleanPhoneNumber(phone);
    if (typeof cleanedPhone !== 'string' || cleanedPhone.length === 0 || cleanedPhone.length > 20) {
      throw new ValidationError('INVALID_INPUT', 'phone');
    }
    assertPhoneCountryAllowed(cleanedPhone, countryFilter);
    const res = await makeRequest('/api/verifications/verification-code', {
      method: 'POST',
      body: { identifier: { type: 'phone', value: cleanedPhone } },
    });
    await throwOnApiError(res, 'VERIFICATION_FAILED', 'phone-verify-send', true);
    const parsed = await res.json();
    if (!parsed.verificationRecordId) {
      throw plainCode('VERIFICATION_FAILED');
    }
    return { verificationId: parsed.verificationRecordId };
  });
}

// ============================================================================
// Verification Code Verification
// ============================================================================

export async function verifyVerificationCode(
  type: 'email' | 'phone',
  value: string,
  verificationId: string,
  code: string
): Promise<DataResult<{ verificationRecordId: string }>> {
  return safeAction(async () => {
    const countryFilter = getCountryFilter();
    // Validate all client-supplied inputs at the trust boundary.
    assertVerificationType(type);
    assertVerificationCode(code);
    assertSafeLogtoId(verificationId, 'verificationId');

    const cleanedValue = type === 'phone' ? cleanPhoneNumber(value) : value;

    if (type === 'phone') {
      assertPhoneCountryAllowed(cleanedValue, countryFilter);
    }

    // Validate value format - mirrors the checks in send*VerificationCode.
    // The value is forwarded verbatim to Logto, so reject bad-shaped input here
    // rather than letting an arbitrary string reach the upstream API.
    if (type === 'email') {
      if (typeof cleanedValue !== 'string' || cleanedValue.length === 0 || cleanedValue.length > 128
          || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedValue)) {
        throw new ValidationError('INVALID_INPUT', 'value');
      }
    } else {
      // PHONE: basic sanity only — let Logto validate E.164
      if (typeof cleanedValue !== 'string' || cleanedValue.length === 0 || cleanedValue.length > 20) {
        throw new ValidationError('INVALID_INPUT', 'value');
      }
    }

    const res = await makeRequest('/api/verifications/verification-code/verify', {
      method: 'POST',
      body: { identifier: { type, value: cleanedValue }, verificationId, code },
    });
    await throwOnApiError(res, 'VERIFICATION_FAILED', 'verify-code', true);
    const parsed = await res.json();
    if (!parsed.verificationRecordId) {
      throw plainCode('VERIFICATION_FAILED');
    }
    return { verificationRecordId: parsed.verificationRecordId };
  });
}

// ============================================================================
// Contact Information Updates (Require Verification)
// ============================================================================

export async function updateEmailWithVerification(
  email: string | null,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(newIdentifierVerificationRecordId, 'newIdentifierVerificationRecordId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // verificationTimestamp is Logto's expiresAt (server-derived from
    // verifyPasswordForIdentity). We check Date.now() > expiresAt + tolerance — no
    // hardcoded TTL. If Logto changes its TTL this check automatically adapts.
    // 15s forward tolerance handles app clock being ahead of Logto server clock.
    if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
    }

    const res = await makeRequest('/api/my-account/primary-email', {
      method: 'POST',
      body: { email, newIdentifierVerificationRecordId },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'EMAIL_UPDATE_FAILED', 'email-update', true);
  });
}

export async function updatePhoneWithVerification(
  phone: string,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    const countryFilter = getCountryFilter();
    assertSafeLogtoId(newIdentifierVerificationRecordId, 'newIdentifierVerificationRecordId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // verificationTimestamp is Logto's expiresAt (server-derived from
    // verifyPasswordForIdentity). We check Date.now() > expiresAt + tolerance — no
    // hardcoded TTL. If Logto changes its TTL this check automatically adapts.
    // 15s forward tolerance handles app clock being ahead of Logto server clock.
    if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
    }

    const cleanedPhone = cleanPhoneNumber(phone);
    assertPhoneCountryAllowed(cleanedPhone, countryFilter);

    const res = await makeRequest('/api/my-account/primary-phone', {
      method: 'POST',
      body: { phone: cleanedPhone, newIdentifierVerificationRecordId },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'PHONE_UPDATE_FAILED', 'phone-update', true);
  });
}

export async function removeUserEmail(
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // verificationTimestamp is Logto's expiresAt (server-derived from
    // verifyPasswordForIdentity). We check Date.now() > expiresAt + tolerance.
    // 15s forward tolerance handles app clock being ahead of Logto server clock.
    if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
    }

    const res = await makeRequest('/api/my-account/primary-email', {
      method: 'DELETE',
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'EMAIL_UPDATE_FAILED', 'email-remove', true);
  });
}

export async function removeUserPhone(
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // verificationTimestamp is Logto's expiresAt (server-derived from
    // verifyPasswordForIdentity). We check Date.now() > expiresAt + tolerance.
    // 15s forward tolerance handles app clock being ahead of Logto server clock.
    if (Date.now() > verificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
    }

    const res = await makeRequest('/api/my-account/primary-phone', {
      method: 'DELETE',
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'PHONE_UPDATE_FAILED', 'phone-remove', true);
  });
}
