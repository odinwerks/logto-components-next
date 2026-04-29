'use server';

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import {
  assertVerificationType,
  assertVerificationCode,
  assertSafeLogtoId,
} from '../guards';

// ============================================================================
// Password Verification
// ============================================================================

export async function verifyPasswordForIdentity(password: string): Promise<{ verificationRecordId: string }> {
  const res = await makeRequest('/api/verifications/password', {
    method: 'POST',
    body: { password },
  });
  await throwOnApiError(res, 'VERIFICATION_FAILED', 'password-verify');
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error('VERIFICATION_FAILED');
  }
  return { verificationRecordId: parsed.verificationRecordId };
}

// ============================================================================
// Email Verification
// ============================================================================

export async function sendEmailVerificationCode(email: string): Promise<{ verificationId: string }> {
  const res = await makeRequest('/api/verifications/verification-code', {
    method: 'POST',
    body: { identifier: { type: 'email', value: email } },
  });
  await throwOnApiError(res, 'VERIFICATION_FAILED', 'email-verify-send');
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error('VERIFICATION_FAILED');
  }
  return { verificationId: parsed.verificationRecordId };
}

// ============================================================================
// Phone Verification
// ============================================================================

export async function sendPhoneVerificationCode(phone: string): Promise<{ verificationId: string }> {
  const res = await makeRequest('/api/verifications/verification-code', {
    method: 'POST',
    body: { identifier: { type: 'phone', value: phone } },
  });
  await throwOnApiError(res, 'VERIFICATION_FAILED', 'phone-verify-send');
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error('VERIFICATION_FAILED');
  }
  return { verificationId: parsed.verificationRecordId };
}

// ============================================================================
// Verification Code Verification
// ============================================================================

export async function verifyVerificationCode(
  type: 'email' | 'phone',
  value: string,
  verificationId: string,
  code: string
): Promise<{ verificationRecordId: string }> {
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
    throw new Error('VERIFICATION_FAILED');
  }
  return { verificationRecordId: parsed.verificationRecordId };
}

// ============================================================================
// Contact Information Updates (Require Verification)
// ============================================================================

export async function updateEmailWithVerification(
  email: string | null,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
): Promise<void> {
  assertSafeLogtoId(newIdentifierVerificationRecordId, 'newIdentifierVerificationRecordId');
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const res = await makeRequest('/api/my-account/primary-email', {
    method: 'POST',
    body: { email, newIdentifierVerificationRecordId },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  await throwOnApiError(res, 'EMAIL_UPDATE_FAILED', 'email-update');
}

export async function updatePhoneWithVerification(
  phone: string,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
): Promise<void> {
  assertSafeLogtoId(newIdentifierVerificationRecordId, 'newIdentifierVerificationRecordId');
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const res = await makeRequest('/api/my-account/primary-phone', {
    method: 'POST',
    body: { phone, newIdentifierVerificationRecordId },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  await throwOnApiError(res, 'PHONE_UPDATE_FAILED', 'phone-update');
}

export async function removeUserEmail(identityVerificationRecordId: string): Promise<void> {
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const res = await makeRequest('/api/my-account/primary-email', {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  await throwOnApiError(res, 'EMAIL_UPDATE_FAILED', 'email-remove');
}

export async function removeUserPhone(identityVerificationRecordId: string): Promise<void> {
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const res = await makeRequest('/api/my-account/primary-phone', {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  await throwOnApiError(res, 'PHONE_UPDATE_FAILED', 'phone-remove');
}
