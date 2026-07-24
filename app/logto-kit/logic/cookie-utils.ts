import 'server-only';

/**
 * ============================================================================
 * Unified Logto cookie clearing (Phase 5 storage consolidation)
 * ============================================================================
 *
 * Single source of truth for the cookie-clearing predicate and the clear
 * loop. Replaces the three previously-duplicated implementations in:
 *   - `app/api/wipe/route.ts`        (response-based, Route Handler context)
 *   - `app/callback/route.ts`        (response-based, Route Handler context)
 *   - `app/logto-kit/logic/actions/account.ts` (jar-based, Server Action context)
 *
 * Why two variants (not one)
 * --------------------------
 * `response.cookies.set()` is the `NextResponse`-based API available in
 * middleware and Route Handlers; `cookies().set()` is the
 * `next/headers`-context API available in Server Actions. They operate on
 * different objects and cannot be unified into one function without
 * abstracting over both — which would obscure the context boundary. The
 * shared `isLogtoCookie` predicate is the single source of truth for the
 * names; the two loop helpers are thin, context-appropriate wrappers.
 *
 * NEVER-TOUCH compliance
 * ----------------------
 *   - `VERIFICATION_COOKIE_NAME` is imported read-only from
 *     `verification-cookie.ts` (NOT redefined here). The HMAC sealing and
 *     verification logic in that module is untouched.
 *   - No new entry points are introduced — the helpers are invoked from the
 *     same routes as before (wipe, callback, account-deletion).
 *   - All cleared cookies use `{ maxAge: 0, path: '/' }` — identical to the
 *     previous inline loops.
 */

import type { NextRequest, NextResponse } from 'next/server';
import { VERIFICATION_COOKIE_NAME } from './actions/verification-cookie';

/** Cookie name for the active-org preference (kept in sync with `preferences.tsx`). */
const ACTIVE_ORG_COOKIE = 'logto-active-org';

/**
 * True for any cookie the app must clear on sign-out / wipe / account
 * deletion / OAuth-failure. Matches:
 *   - All Logto SDK cookies (prefixed `logto_`).
 *   - The active-org preference cookie (`logto-active-org`).
 *   - The sealed verification cookie (`logto-verification-seal`).
 *
 * This is the single predicate used by both clear helpers below.
 */
export function isLogtoCookie(name: string): boolean {
  return (
    name.startsWith('logto_') ||
    name === ACTIVE_ORG_COOKIE ||
    name === VERIFICATION_COOKIE_NAME
  );
}

/**
 * For Route Handlers / middleware: clears all Logto cookies on the outbound
 * `NextResponse`. Reads present cookies from `request.cookies` and sets each
 * matching one to empty with `maxAge: 0, path: '/'`.
 *
 * Used by `app/api/wipe/route.ts` and `app/callback/route.ts`.
 *
 * @returns the same `response` (mutated in place) so callers can chain.
 */
export function clearLogtoCookiesFromResponse(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  for (const cookie of request.cookies.getAll()) {
    if (isLogtoCookie(cookie.name)) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
    }
  }
  return response;
}

/**
 * For Server Actions: clears all Logto cookies via the `next/headers` cookie
 * jar. `cookieStore` is the awaited `cookies()` instance.
 *
 * Used by `app/logto-kit/logic/actions/account.ts` (account deletion).
 *
 * @remarks
 * The `cookieStore.set()` API available inside Server Actions differs from
 * the `NextResponse.cookies.set()` API available in Route Handlers — hence
 * the two variants. Both clear the same set of names (via `isLogtoCookie`).
 */
export async function clearLogtoCookiesFromJar(
  cookieStore: Awaited<ReturnType<typeof import('next/headers').cookies>>,
): Promise<void> {
  for (const cookie of cookieStore.getAll()) {
    if (isLogtoCookie(cookie.name)) {
      cookieStore.set(cookie.name, '', { maxAge: 0, path: '/' });
    }
  }
}
