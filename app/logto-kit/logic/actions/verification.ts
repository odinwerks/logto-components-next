'use server';

import { makeRequest } from './request';
import { throwOnApiError } from './shared';

// ============================================================================
// Password Verification
// ============================================================================

/**
 * Verifies the user's password for identity verification.
 * @param password - The user's current password.
 * @returns Object containing verificationRecordId.
 */
export async function verifyPasswordForIdentity(password: string): Promise<{ verificationRecordId: string }> {
  const res = await makeRequest('/api/verifications/password', {
    method: 'POST',
    body: { password },
  });
  
  await throwOnApiError(res, 'Password verification failed');
  
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationRecordId: parsed.verificationRecordId };
}

// ============================================================================
// Email Verification
// ============================================================================

/**
 * Sends an email verification code.
 * @param email - The email address to verify.
 * @returns Object containing verificationId.
 */
export async function sendEmailVerificationCode(email: string): Promise<{ verificationId: string }> {
  const res = await makeRequest('/api/verifications/verification-code', {
    method: 'POST',
    body: { identifier: { type: 'email', value: email } },
  });
  
  await throwOnApiError(res, 'Email verification send failed');
  
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationId: parsed.verificationRecordId };
}

// ============================================================================
// Phone Verification
// ============================================================================

/**
 * Sends a phone verification code.
 * @param phone - The phone number to verify.
 * @returns Object containing verificationId.
 */
export async function sendPhoneVerificationCode(phone: string): Promise<{ verificationId: string }> {
  const res = await makeRequest('/api/verifications/verification-code', {
    method: 'POST',
    body: { identifier: { type: 'phone', value: phone } },
  });
  
  await throwOnApiError(res, 'Phone verification send failed');
  
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationId: parsed.verificationRecordId };
}

// ============================================================================
// Verification Code Verification
// ============================================================================

/**
 * Verifies a verification code.
 * @param type - The type of verification ('email' or 'phone').
 * @param value - The email or phone value.
 * @param verificationId - The verification ID from the send code step.
 * @param code - The verification code entered by the user.
 * @returns Object containing verificationRecordId.
 */
export async function verifyVerificationCode(
  type: 'email' | 'phone',
  value: string,
  verificationId: string,
  code: string
): Promise<{ verificationRecordId: string }> {
  const res = await makeRequest('/api/verifications/verification-code/verify', {
    method: 'POST',
    body: { identifier: { type, value }, verificationId, code },
  });
  
  await throwOnApiError(res, 'Verification failed');
  
  const parsed = await res.json();
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationRecordId: parsed.verificationRecordId };
}

// ============================================================================
// Contact Information Updates (Require Verification)
// ============================================================================

/**
 * Updates the user's primary email with verification.
 * @param email - The new email address (or null to remove).
 * @param newIdentifierVerificationRecordId - Verification record for the new email.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function updateEmailWithVerification(
  email: string | null,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-email', {
    method: 'POST',
    body: { email, newIdentifierVerificationRecordId },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'Email update failed');
}

/**
 * Updates the user's primary phone with verification.
 * @param phone - The new phone number.
 * @param newIdentifierVerificationRecordId - Verification record for the new phone.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function updatePhoneWithVerification(
  phone: string,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-phone', {
    method: 'POST',
    body: { phone, newIdentifierVerificationRecordId },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'Phone update failed');
}

/**
 * Removes the user's primary email.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function removeUserEmail(identityVerificationRecordId: string): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-email', {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'Email removal failed');
}

/**
 * Removes the user's primary phone.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function removeUserPhone(identityVerificationRecordId: string): Promise<void> {
  const res = await makeRequest('/api/my-account/primary-phone', {
    method: 'DELETE',
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });
  
  await throwOnApiError(res, 'Phone removal failed');
}
