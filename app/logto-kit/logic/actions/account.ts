'use server';

import { getManagementApiToken } from '../../../logto';
import { getCleanEndpoint, introspectToken, assertSafeUserId } from '../utils';
import { makeRequest } from './request';
import { throwOnApiError } from './shared';

/**
 * Validates a user token via introspection.
 * @param accessToken - The access token to validate.
 * @param userId - The expected user ID.
 */
async function validateUserToken(accessToken: string, userId: string): Promise<void> {
  await assertSafeUserId(userId);
  
  const introspection = await introspectToken(accessToken);
  
  if (!introspection.active) {
    throw new Error('UNAUTHORIZED: token is not active or has been revoked.');
  }
  
  if (introspection.sub !== userId) {
    throw new Error('UNAUTHORIZED: token subject does not match the provided userId.');
  }
}

/**
 * Permanently deletes the currently authenticated user's account.
 *
 * The Logto Account API has no self-delete endpoint — deletion goes through
 * the Management API. `getManagementApiToken` in logto.ts handles the
 * client-credentials grant so this action stays clean.
 *
 * Flow:
 *   1. Confirms the session is valid and reads `userId` from claims.
 *   2. Verifies the Account API still accepts the bearer token.
 *   3. Calls `getManagementApiToken()` from logto.ts.
 *   4. Deletes the user via `DELETE /api/users/{userId}`.
 *
 * IMPORTANT: This action deliberately does NOT call signOut() or redirect().
 * Calling signOut() inside a server action fires Next.js redirect() which races
 * with AuthWatcher's router.refresh() interval — the result is a cascade of
 * "failed to fetch" errors as AuthWatcher keeps hitting a torn-down session.
 *
 * Instead, this action returns cleanly and the CLIENT navigates to
 * /api/auth/sign-out via window.location.href. That route handler calls
 * signOut() in isolation, with no concurrent RSC re-renders in flight.
 *
 * @param identityVerificationRecordId - Verification record for identity (unused but kept for API consistency).
 * @param accessToken - The access token for validation.
 */
export async function deleteUserAccount(
  identityVerificationRecordId: string,
  accessToken: string,
): Promise<void> {
  // This is a server action - proxy handles auth, we just need user ID from API
  // ── Step 1: get user data to find userId ────────────────────────────────
  const accountCheck = await makeRequest('/api/my-account');
  if (!accountCheck.ok) {
    throw new Error('Could not verify account session before deletion.');
  }

  const userData = await accountCheck.json();
  const userId = userData.id;

  if (!userId) {
    throw new Error('User ID not found.');
  }

  // ── Step 2: validate user token via introspection ────────────────────────
  await validateUserToken(accessToken, userId);

  // ── Step 3: get Management API token (M2M, lives in logto.ts) ────────────
  const mgmtToken = await getManagementApiToken();
  const cleanEndpoint = await getCleanEndpoint();

  // ── Step 4: delete via Management API ────────────────────────────────────
  const deleteRes = await fetch(`${cleanEndpoint}/api/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${mgmtToken}`,
    },
  });

  await throwOnApiError(deleteRes, 'Account deletion failed');

  // Return cleanly. The client (security.tsx handleDeleteAccount) is
  // responsible for navigating to /api/auth/sign-out after this resolves.
}
