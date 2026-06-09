'use server';

import { cookies } from 'next/headers';
import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { assertSafeUserId, assertSafeLogtoId } from '../guards';
import { makeRequest } from './request';
import { throwOnApiError, sanitize } from '../errors';
import { getTokenForServerAction } from './tokens';
import { safeAction, type ActionResult } from './safe';

import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS } from '../constants';
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
 * @param verificationRecordTimestamp - REQUIRED. Timestamp (ms) derived
 *   server-side from Logto's `expiresAt` field (returned by
 *   verifyPasswordForIdentity). Never trust a client-supplied value here -
 *   always pass the timestamp from the verification action's DataResult.
 *   Omitting this parameter bypasses the staleness check (BUG-SEC-003).
 */
export async function deleteUserAccount(
  identityVerificationRecordId: string,
  verificationRecordTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Require the caller to have completed password verification ─────────
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // verificationTimestamp is now Logto's expiresAt (server-derived, changed
    // in verification.ts). We just check Date.now() > expiresAt - no hardcoded
    // TTL. If Logto changes its TTL this check automatically adapts.
    // BUG-SEC-003: This check is mandatory - never skip it.
    if (Date.now() > verificationRecordTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
      throw new Error('VERIFICATION_EXPIRED');
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
    await throwOnApiError(accountCheck, 'UNAUTHORIZED', 'Account verification check', true);

    // ── Mint narrowly-scoped M2M token and delete the user ─────────────────
    const mgmtToken = await getManagementApiToken();
    const cleanEndpoint = getCleanEndpoint();

    const deleteRes = await fetch(`${cleanEndpoint}/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        'logto-verification-id': identityVerificationRecordId,
      },
    });

    await throwOnApiError(deleteRes, 'DELETE_FAILED', 'account-delete');

    // Audit the deletion - this is the last thing we do before returning.
    const { audit } = await import('../audit');
    await audit({ actor: userId, action: 'account.delete', resource: userId });

    // Clear all local logto_ and logto-active-org cookies on path / (BUG-003)
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith('logto_') || cookie.name === 'logto-active-org') {
        cookieStore.set(cookie.name, '', { maxAge: 0, path: '/' });
      }
    }

    // Client navigates away after this resolves (window.location.href).
  });
}
