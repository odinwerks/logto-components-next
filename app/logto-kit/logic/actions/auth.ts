'use server';

import { signIn, signOut } from '@logto/next/server-actions';
import { logtoConfig, getLogtoConfig } from '../../config';

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
 */
export async function signInUser(routeTo?: string): Promise<void> {
  if (routeTo !== undefined) {
    assertSafeRouteTo(routeTo);
  }

  const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';

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
 */
export async function signOutUser(): Promise<void> {
  await signOut(getLogtoConfig());
}
