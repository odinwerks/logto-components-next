'use server';

import { signIn, signOut } from '@logto/next/server-actions';
import { logtoConfig, getLogtoConfig } from '../../config';
import { sanitize } from '../errors';

/**
 * Validates that routeTo is a safe same-origin relative path.
 * Throws if the path is absolute, protocol-relative, or contains an embedded origin.
 */
function assertSafeRouteTo(routeTo: string): void {
  if (!routeTo.startsWith('/')) {
    throw new Error('Invalid routeTo: must be a relative path starting with /');
  }
  // Reject protocol-relative or embedded origins
  if (routeTo.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(routeTo)) {
    throw new Error('Invalid routeTo: must be a same-origin relative path');
  }
}

/**
 * Initiates the Logto sign-in flow.
 *
 * @param routeTo - Optional relative path (e.g. '/dashboard') to redirect to
 *   after sign-in completes. Must start with '/' and must not be an absolute
 *   URL or protocol-relative URL to prevent open-redirect attacks.
 * @param lang - Optional BCP 47 language tag (e.g. 'ka-GE') to forward to
 *   Logto as the OIDC `ui_locales` parameter. This drives the hosted
 *   sign-in experience language and the locale of passcode emails/SMS.
 */
export async function signInUser(routeTo?: string, lang?: string): Promise<void> {
  if (routeTo !== undefined) {
    assertSafeRouteTo(routeTo);
  }

  const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';

  await signIn(
    logtoConfig,
    routeTo || lang
      ? {
          redirectUri: new URL('/callback', baseUrl).toString(),
          postRedirectUri: routeTo ? new URL(routeTo, baseUrl).toString() : undefined,
          extraParams: lang ? { ui_locales: lang } : undefined,
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
