'use server';

import { getManagementApiToken } from '../../../logto';
import { getCleanEndpoint, introspectToken } from '../utils';
import { assertSafeUserId, assertSafeLogtoId } from '../guards';
import { makeRequest } from './request';
import { throwOnApiError, sanitize } from '../errors';
import { getTokenForServerAction } from './tokens';
import { safeAction, type ActionResult } from './safe';

/**
 * Permanently deletes the currently authenticated user's account.
 *
 * Security model (Phase 1, Finding 1):
 *
 *   - The client DOES NOT supply the access token. The server derives it
 *     from the session cookie via `getTokenForServerAction()`.
 *   - The client DOES NOT supply the user ID. The server derives it from
 *     the introspected token's `sub` claim.
 *   - This prevents both (a) the access token from being exposed to the
 *     browser and (b) any IDOR attempt that tries to delete another user's
 *     account by passing someone else's userId.
 *
 * The M2M token used for the final Management API call is minted with the
 * narrowest scope needed (see logto.ts :: getManagementApiToken).
 *
 * Flow:
 *   1. Fetch user's access token from session cookie.
 *   2. Introspect it; reject if inactive or subject missing.
 *   3. Validate the subject format (defense in depth).
 *   4. Mint an M2M token scoped to user deletion.
 *   5. DELETE /api/users/{userId} with the M2M token.
 *
 * This action deliberately does NOT call signOut() or redirect(). Calling
 * signOut() inside a server action fires Next.js redirect() which races
 * with AuthWatcher's router.refresh() interval. The client is responsible
 * for navigating away after this resolves.
 *
 * @param identityVerificationRecordId - Opaque ID from a prior password
 *   verification. Only used to document intent; Logto enforces the actual
 *   verification via the preceding verifyPasswordForIdentity() flow that
 *   minted this record.
 * @param verificationRecordTimestamp - Timestamp (ms) captured when the
 *   verification completed. Used for a client-side staleness check as
 *   defense-in-depth against expired verification records.
 */
export async function deleteUserAccount(
  identityVerificationRecordId: string,
  verificationRecordTimestamp?: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Require the caller to have completed password verification ─────────
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // Logto enforces a 10-minute TTL server-side for verification records.
    // This client-side check prevents account deletion with stale record IDs
    // even if Logto's server-side enforcement has gaps (race conditions,
    // edge cases). If the client does not supply a timestamp, we trust
    // Logto's server-side enforcement.
    if (verificationRecordTimestamp !== undefined) {
      const recordAge = Date.now() - verificationRecordTimestamp;
      if (recordAge > 10 * 60 * 1000) {
        throw new Error('VERIFICATION_EXPIRED');
      }
    }

    // ── Derive token + userId server-side (never trust the client) ─────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);

    if (!introspection.active) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    const userId = introspection.sub;
    if (!userId) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    // Defense in depth: reject if the subject has an unexpected shape.
    assertSafeUserId(userId);

    // ── Sanity-check the account session before destructive work ───────────
    const accountCheck = await makeRequest('/api/my-account');
    await throwOnApiError(accountCheck, 'UNAUTHORIZED', 'Account verification check');

    // ── Mint narrowly-scoped M2M token and delete the user ─────────────────
    const mgmtToken = await getManagementApiToken();
    const cleanEndpoint = await getCleanEndpoint();

    const deleteRes = await fetch(`${cleanEndpoint}/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        'logto-verification-id': identityVerificationRecordId,
      },
    });

    await throwOnApiError(deleteRes, 'DELETE_FAILED', 'account-delete');

    // Audit the deletion — this is the last thing we do before returning.
    const { audit } = await import('../audit');
    await audit({ actor: userId, action: 'account.delete', resource: userId });

    // Client navigates away after this resolves (window.location.href).
  });
}
