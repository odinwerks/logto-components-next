'use server';

import { cookies } from 'next/headers';
import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { assertSafeLogtoId } from '../guards';
import { makeRequest } from './request';
import { throwOnApiError, sanitize } from '../errors';
import { auditSafe } from './helpers';
import { requireVerifiedIdentity, clearVerificationCookie } from './verification-cookie';
import { clearLogtoCookiesFromJar } from '../cookie-utils';
import { getTokenForServerAction } from './tokens';
import { safeAction, type ActionResult } from './safe';
import { logEvent } from '../log';
import { LOG_EVENTS } from '../../../lib/log-events';

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
 * Verification staleness (BUG-001 fix): the expiry is read from the
 * server-sealed, HMAC-signed httpOnly cookie set by
 * `verifyPasswordForIdentity` (via `requireVerifiedIdentity`), NOT from a
 * client-supplied timestamp. A malicious client can no longer substitute
 * `Date.now()` to bypass the local staleness check. Logto's server-side
 * `logto-verification-id` TTL remains the authoritative gate.
 *
 * Flow:
 *   1. Verify the sealed cookie + staleness (requireVerifiedIdentity).
 *   2. Fetch user's access token from session cookie.
 *   3. Introspect it; reject if inactive or subject missing.
 *   4. Validate the subject format (defense in depth).
 *   5. Mint an M2M token scoped to user deletion.
 *   6. DELETE /api/users/{userId} with the M2M token.
 *
 * This action deliberately does NOT call signOut() or redirect(). Calling
 * signOut() inside a server action fires Next.js redirect() which races
 * with AuthWatcher's router.refresh() interval. The client is responsible
 * for navigating away after this resolves.
 *
 * @param identityVerificationRecordId - Opaque ID from a prior password
 *   verification. Forwarded to Logto as the `logto-verification-id` header
 *   and bound against the sealed verification cookie. Logto enforces the
 *   actual verification record TTL server-side.
 */
export async function deleteUserAccount(
  identityVerificationRecordId: string,
): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Require the caller to have completed password verification ─────────
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

    // ── Staleness check (defense in depth) ────────────────────────────────
    // BUG-001 fix: reads the server-sealed httpOnly cookie (set by
    // verifyPasswordForIdentity) and verifies its HMAC + binds the sealed
    // recordId to the supplied identityVerificationRecordId + checks the
    // sealed expiresAt. The client cannot tamper with this value.
    await requireVerifiedIdentity(identityVerificationRecordId);

    // ── Derive token + userId server-side (never trust the client) ─────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });

    if (!introspection.active) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    const userId = introspection.sub;
    if (!userId) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    // Defense in depth: reject if the subject has an unexpected shape.
    assertSafeLogtoId(userId, 'userId');

    // ── Sanity-check the account session before destructive work ───────────
    const accountCheck = await makeRequest('/api/my-account');
    await throwOnApiError(accountCheck, 'UNAUTHORIZED', 'Account verification check');

    // ── Mint narrowly-scoped M2M token and delete the user ─────────────────
    const mgmtToken = await getManagementApiToken();
    const cleanEndpoint = getCleanEndpoint();

    // NOTE: Logto internally revokes all tokens and sessions during user deletion.
    // The DELETE /api/users/{userId} endpoint (Logto Management API) calls
    // signOutUser(userId) before deletion, which revokes:
    //   - AccessTokens, RefreshTokens, Sessions, OIDC session extensions
    // Source: packages/core/src/routes/admin-user/basics.ts in Logto OSS.
    // The ?revokeGrants=true query parameter does NOT exist in the Management API.
    // Logto's internal revocation is automatic and cannot be bypassed.
    const deleteRes = await fetch(`${cleanEndpoint}/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${mgmtToken}`,
        'logto-verification-id': identityVerificationRecordId,
      },
    });

    await throwOnApiError(deleteRes, 'DELETE_FAILED', 'account-delete');

    // Audit and cookie cleanup are best-effort: if they fail, the account
    // deletion itself has already succeeded. Don't let post-deletion
    // bookkeeping failures mask the successful deletion.
    try {
      auditSafe(userId, 'account.delete', userId);
      logEvent.info(LOG_EVENTS.ACCOUNT_DELETE, 'Account deleted', {});
    } catch {
      // auditSafe already swallows errors; this is defense in depth
    }

    // Clear all local Logto cookies on path / (BUG-003), plus the sealed
    // verification cookie (no longer valid after deletion). The shared
    // `clearLogtoCookiesFromJar` helper clears everything matched by the
    // `isLogtoCookie` predicate (logto_*, logto-active-org, and the
    // verification seal itself).
    try {
      const cookieStore = await cookies();
      await clearLogtoCookiesFromJar(cookieStore);
    } catch {
      // Best-effort cookie cleanup — deletion already succeeded
    }
    // Best-effort: clear the sealed verification cookie regardless of the
    // loop above (it is also cleared by the helper, but the explicit call is
    // harmless defense-in-depth and matches existing style).
    await clearVerificationCookie();

    // Client navigates away after this resolves (window.location.href).
  });
}
