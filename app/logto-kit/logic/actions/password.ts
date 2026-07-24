'use server';

import { makeRequest } from './request';
import { throwOnApiError, plainCode } from '../errors';
import { assertSafeLogtoId } from '../guards';
import { ValidationError } from '../validation';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import { safeAction, type ActionResult } from './safe';

import { auditSafe } from './helpers';
import { requireVerifiedIdentity } from './verification-cookie';
import { logEvent } from '../log';
import { LOG_EVENTS } from '../../../lib/log-events';
/**
 * Changes the authenticated user's password.
 * Error messages are sanitised in production to prevent enumeration.
 */
export async function updateUserPassword(
  newPassword: string,
  identityVerificationRecordId: string,
): Promise<ActionResult> {
  return safeAction(async () => {
    // BUG-012: assertAudience: true validates the token was issued for this
    // app before the destructive password-change operation proceeds.
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }
    const userId = introspection.sub;

    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
    // ── Staleness check (defense in depth) ────────────────────────────────
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie
    // (set by verifyPasswordForIdentity), not a client-supplied timestamp.
    await requireVerifiedIdentity(identityVerificationRecordId);
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
    auditSafe(userId, 'password.change');
    logEvent.info(LOG_EVENTS.PASSWORD_CHANGE, 'Password changed', {});
  });
}
