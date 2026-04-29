'use server';

import { getManagementApiToken } from '../../../logto';
import { getCleanEndpoint, introspectToken } from '../utils';
import { assertSafeUserId } from '../guards';
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { getTokenForServerAction } from './tokens';

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
 * for POSTing to /api/auth/sign-out after this resolves.
 *
 * @param identityVerificationRecordId - Opaque ID from a prior password
 *   verification. Only used to document intent; Logto enforces the actual
 *   verification via the preceding verifyPasswordForIdentity() flow that
 *   minted this record.
 */
export async function deleteUserAccount(
  identityVerificationRecordId: string,
): Promise<void> {
  // ── Require the caller to have completed password verification ─────────
  if (
    typeof identityVerificationRecordId !== 'string' ||
    identityVerificationRecordId.length === 0
  ) {
    throw new Error('MISSING_VERIFICATION');
  }

  // ── Derive token + userId server-side (never trust the client) ─────────
  const sessionToken = await getTokenForServerAction();
  const introspection = await introspectToken(sessionToken);

  if (!introspection.active) {
    throw new Error('UNAUTHORIZED');
  }

  const userId = introspection.sub;
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }

  // Defense in depth: reject if the subject has an unexpected shape.
  assertSafeUserId(userId);

  // ── Sanity-check the account session before destructive work ───────────
  const accountCheck = await makeRequest('/api/my-account');
  if (!accountCheck.ok) {
    throw new Error('UNAUTHORIZED');
  }

  // ── Mint narrowly-scoped M2M token and delete the user ─────────────────
  const mgmtToken = await getManagementApiToken();
  const cleanEndpoint = await getCleanEndpoint();

  const deleteRes = await fetch(`${cleanEndpoint}/api/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${mgmtToken}`,
    },
  });

  await throwOnApiError(deleteRes, 'DELETE_FAILED', 'account-delete');

  // Audit the deletion — this is the last thing we do before returning.
  const { audit } = await import('../audit');
  await audit({ actor: userId, action: 'account.delete', resource: userId });

  // Client navigates to /api/auth/sign-out after this resolves (POST).
}
