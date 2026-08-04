'use server';

import { signIn, signOut } from '@logto/next/server-actions';
import { cookies } from 'next/headers';
import { logtoConfig, getLogtoConfig } from '../../config';
import { sanitize } from '../errors';
import { assertSafeRouteTo } from '../assert-safe-route';
import { clearLogtoCookiesFromJar } from '../cookie-utils';

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
    // Let the SDK read the existing session and attempt server-side token
    // revocation before local cookies are expired.
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
  } finally {
    // The SDK can fail before it clears its cookie storage (for example while
    // loading OIDC discovery). Always expire the local session and related
    // Logto cookies, but never let cleanup mask the SDK error or redirect.
    try {
      const cookieStore = await cookies();
      await clearLogtoCookiesFromJar(cookieStore);
    } catch {
      // Best-effort local cleanup; preserve the original control flow.
    }
  }
}
