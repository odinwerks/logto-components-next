'use server';

import { signIn, signOut } from '@logto/next/server-actions';
import { logtoConfig, getLogtoConfig } from '../../config';
import { sanitize } from '../errors';
import { assertSafeRouteTo } from '../assert-safe-route';

/**
 * Initiates the Logto sign-in flow.
 *
 * @param routeTo - Optional relative path (e.g. '/dashboard') to redirect to
 *   after sign-in completes. Must be a same-origin relative path to prevent
 *   open-redirect attacks (validated via origin-equality in `assertSafeRouteTo`).
 */
export async function signInUser(routeTo?: string): Promise<void> {
  const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';

  if (routeTo !== undefined) {
    assertSafeRouteTo(routeTo, baseUrl);
  }

  await signIn(
    logtoConfig,
    routeTo
      ? {
          redirectUri: new URL('/callback', baseUrl).toString(),
          postRedirectUri: new URL(routeTo, baseUrl).toString(),
        }
      : undefined
  );
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
