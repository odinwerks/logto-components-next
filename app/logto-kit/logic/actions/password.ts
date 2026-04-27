'use server';

import { makeRequest } from './request';

/**
 * Changes the authenticated user's password.
 *
 * Flow:
 *   1. Obtain a verificationRecordId via `verifyPasswordForIdentity` (current
 *      password) or the email/phone verification code flow.
 *   2. Pass that ID + the desired new password here.
 *
 * The new password must satisfy the policy configured in
 * Console > Security > Password policy. Logto returns structured validation
 * errors on failure — the thrown message is UI-safe.
 *
 * @param newPassword - The new password.
 * @param identityVerificationRecordId - Verification record for identity.
 */
export async function updateUserPassword(
  newPassword: string,
  identityVerificationRecordId: string
): Promise<void> {
  const res = await makeRequest('/api/my-account/password', {
    method: 'POST',
    body: { password: newPassword },
    extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
  });

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText.substring(0, 400);
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.message) detail = parsed.message;
    } catch {
      // not JSON, use raw text
    }
    throw new Error(`Password update failed ${res.status}: ${detail}`);
  }
}
