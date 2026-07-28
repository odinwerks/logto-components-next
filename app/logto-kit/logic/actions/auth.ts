'use server';

import { signIn, signOut } from '@logto/next/server-actions';
import { logtoConfig, getLogtoConfig } from '../../config';
import { sanitize } from '../errors';
import { assertSafeRouteTo } from '../assert-safe-route';
import { clearVerificationCookie } from './verification-cookie';

/**
 * Initiates the Logto sign-in flow.
 *
 * @param routeTo - Optional relative path (e.g. '/dashboard') to redirect to
 *   after sign-in completes. Must be a same-origin relative path to prevent
 *   open-redirect attacks (validated via origin-equality in `assertSafeRouteTo`).
 *
 * On success, `signIn()` throws `NEXT_REDIRECT` (a Next.js redirect pseudo-error)
 * which is intentionally re-thrown so the router can handle it.
 * Any other error (malformed BASE_URL → TypeError, SDK internal failures) is
 * sanitized before propagating to prevent internals from leaking across the
 * Server Action boundary (BUG-013).
 */
export async function signInUser(routeTo?: string): Promise<void> {
  const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';

  if (routeTo !== undefined) {
    assertSafeRouteTo(routeTo, baseUrl);
  }

  try {
    await signIn(
      logtoConfig,
      routeTo
        ? {
            redirectUri: new URL('/callback', baseUrl).toString(),
            postRedirectUri: new URL(routeTo, baseUrl).toString(),
          }
        : undefined
    );
  } catch (err) {
    // NEXT_REDIRECT is a control-flow pseudo-error that Next.js uses to perform
    // server-side redirects. It must be re-thrown unchanged so the router can
    // pick it up. All other errors are sanitized before propagating.
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    throw sanitize(err, { fallback: 'INTERNAL_ERROR' });
  }
}

/**
 * Signs out the current user.
 *
 * On success, `signOut()` throws `NEXT_REDIRECT` (a Next.js redirect pseudo-error)
 * which is intentionally re-thrown so the router can handle it.
 * Any other error is sanitized before propagating to prevent SDK internals from
 * leaking across the Server Action boundary.
 */
export async function signOutUser(): Promise<void> {
  try {
    // Clear the verification seal BEFORE sign-out so that a stale cookie
    // (User A's verification) is never left behind for User B on the same
    // browser (CAN-ACT-002). `clearVerificationCookie()` is best-effort and
    // internally catches errors, so it won't block the sign-out redirect.
    await clearVerificationCookie();
    await signOut(getLogtoConfig());
  } catch (err) {
    // NEXT_REDIRECT is a control-flow pseudo-error that Next.js uses to perform
    // server-side redirects. It must be re-thrown unchanged so the router can
    // pick it up. All other errors are sanitized before propagating.
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    throw sanitize(err, { fallback: 'INTERNAL_ERROR' });
  }
}
