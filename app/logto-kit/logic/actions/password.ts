'use server';

import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { assertSafeLogtoId } from '../guards';
import { ValidationError } from '../validation';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import { safeAction, type ActionResult } from './safe';

import { assertVerificationNotExpired, auditSafe } from './helpers';
/**
 * Changes the authenticated user's password.
 * Error messages are sanitised in production to prevent enumeration.
 */
export async function updateUserPassword(
  newPassword: string,
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
    assertVerificationNotExpired(verificationTimestamp);
    if (typeof newPassword !== 'string' || newPassword.length > 256 || newPassword.length < 8) {
      throw new ValidationError('INVALID_INPUT', 'newPassword');
    }

    const res = await makeRequest('/api/my-account/password', {
      method: 'POST',
      body: { password: newPassword },
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });

    await throwOnApiError(res, 'PASSWORD_UPDATE_FAILED', 'Update password', true);

    // Audit (best-effort - failure must not break the main action)
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    auditSafe(introspection.sub ?? 'unknown', 'password.change');
  });
}
