/**
 * logto-kit/src/components/handlers/index.tsx
 *
 * Central export for Logto auth primitives:
 *   - SignedIn / SignedOut  → async Server Components (live session check per request)
 *
 * For "live by force" client-side reactivity, pair with <AuthWatcher />
 * from './auth-watcher'. That component calls router.refresh() on tab focus
 * and on an interval, which re-runs these server components without a full reload.
 */

import { unstable_noStore as noStore } from 'next/cache';
import { safeGetLogtoContext } from '../../logic/logto-context';
import { logtoConfig } from '../../../../logto';

export { logtoConfig };

// =============================================================================
// SERVER COMPONENTS — async, run on every request, never reach the client bundle
// =============================================================================

/**
 * <SignedIn>
 *
 * Renders `children` ONLY when the user has a live, verified Logto session.
 *
 * How it works:
 *   1. Calls noStore() — opts this render out of Next.js's Data Cache entirely.
 *   2. Reads the encrypted Logto session cookie.
 *   3. Makes a live network call to Logto's /oidc/userinfo endpoint.
 *   4. Only renders children if BOTH the cookie is valid AND the live call
 *      succeeds — meaning the user account still exists in Logto right now.
 *
 * This catches all stale-session scenarios:
 *   - Account deleted from Logto admin console
 *   - Session manually revoked
 *   - Access token expired with no valid refresh token
 *
 * @param fallback — Optional ReactNode to render when NOT signed in (default: null).
 */
export async function SignedIn({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  // Bust the Data Cache. Must be called before any async work.
  noStore();

  try {
    const { isAuthenticated, userInfo } = await safeGetLogtoContext(true);

    if (!isAuthenticated || !userInfo) {
      return <>{fallback}</>;
    }

    return <>{children}</>;
  } catch {
    // fetchUserInfo throws when the user was deleted, token was revoked, or
    // Logto is temporarily unreachable. In all cases: fail safe → unauthenticated.
    return <>{fallback}</>;
  }
}

/**
 * <SignedOut>
 *
 * Renders `children` ONLY when there is NO valid active session.
 * The exact logical complement of <SignedIn>.
 *
 * The same live userinfo check + noStore() runs here, so a user whose account
 * was deleted correctly sees the SignedOut UI rather than a limbo state.
 */
export async function SignedOut({ children }: { children: React.ReactNode }) {
  // Bust the Data Cache.
  noStore();

  try {
    const { isAuthenticated, userInfo } = await safeGetLogtoContext(true);

    if (isAuthenticated && userInfo) {
      return null;
    }

    return <>{children}</>;
  } catch {
    // Live check failed → treat as signed out → show the children.
    return <>{children}</>;
  }
}
