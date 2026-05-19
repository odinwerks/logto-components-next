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

// ============================================================================
// Password Verification
// ============================================================================

export async function verifyPasswordForIdentity(password: string): Promise<DataResult<{ verificationRecordId: string }>> {
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
    await throwOnApiError(res, 'VERIFICATION_FAILED', 'password-verify');
    const parsed = await res.json();
    if (!parsed.verificationRecordId) {
      throw plainCode('VERIFICATION_FAILED');
    }
    return { verificationRecordId: parsed.verificationRecordId };
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
    await throwOnApiError(res, 'VERIFICATION_FAILED', 'email-verify-send');
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
    if (typeof phone !== 'string' || phone.length === 0 || phone.length > 20 || !/^\+[1-9]\d{1,14}$/.test(phone)) {
      throw new ValidationError('INVALID_INPUT', 'phone');
    }
    const res = await makeRequest('/api/verifications/verification-code', {
      method: 'POST',
      body: { identifier: { type: 'phone', value: phone } },
    });
    await throwOnApiError(res, 'VERIFICATION_FAILED', 'phone-verify-send');
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
    // Validate all client-supplied inputs at the trust boundary.
    assertVerificationType(type);
    assertVerificationCode(code);
    assertSafeLogtoId(verificationId, 'verificationId');

    const res = await makeRequest('/api/verifications/verification-code/verify', {
      method: 'POST',
      body: { identifier: { type, value }, verificationId, code },
    });
    await throwOnApiError(res, 'VERIFICATION_FAILED', 'verify-code');
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
  identityVerificationRecordId: string
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(newIdentifierVerificationRecordId, 'newIdentifierVerificationRecordId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    const res = await makeRequest('/api/my-account/primary-email', {
      method: 'POST',
      body: { email, newIdentifierVerificationRecordId },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'EMAIL_UPDATE_FAILED', 'email-update');
  });
}

export async function updatePhoneWithVerification(
  phone: string,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(newIdentifierVerificationRecordId, 'newIdentifierVerificationRecordId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    const res = await makeRequest('/api/my-account/primary-phone', {
      method: 'POST',
      body: { phone, newIdentifierVerificationRecordId },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'PHONE_UPDATE_FAILED', 'phone-update');
  });
}

export async function removeUserEmail(identityVerificationRecordId: string): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    const res = await makeRequest('/api/my-account/primary-email', {
      method: 'DELETE',
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'EMAIL_UPDATE_FAILED', 'email-remove');
  });
}

export async function removeUserPhone(identityVerificationRecordId: string): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    const res = await makeRequest('/api/my-account/primary-phone', {
      method: 'DELETE',
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'PHONE_UPDATE_FAILED', 'phone-remove');
  });
}
