import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../../logto-kit/config';
import { checkSameOrigin } from '../../logto-kit/logic/origin-guard';
import { error } from '../../logto-kit/logic/log';
import type { signOut as SignOutType } from '@logto/next/server-actions';

const ACTIVE_ORG_COOKIE = 'logto-active-org';

function clearLogtoCookies(request: NextRequest, response: NextResponse): NextResponse {
  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('logto_') || cookie.name === ACTIVE_ORG_COOKIE) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
    }
  });
  return response;
}

/**
 * GET clears Logto cookies and redirects home.
 * Convenience handler for browser navigation - plain cookie-clear needs no
 * CSRF protection (not a privileged operation, must remain browser-navigable).
 * The ?force=true path triggers a server-side signOut and IS protected.
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const force = request.nextUrl.searchParams.get('force') === 'true';

  // Only protect the destructive force-signOut path.
  // Plain cookie-clear is safe without CSRF protection since it's
  // not a privileged operation and must remain browser-navigable.
  if (force) {
    const originError = checkSameOrigin(request);
    if (originError) return originError;
  }

  const response = clearLogtoCookies(
    request,
    NextResponse.redirect(new URL('/', baseUrl)),
  );

  if (force) {
    let signOutFn: typeof SignOutType | undefined;
    try {
      const mod = await import('@logto/next/server-actions');
      signOutFn = mod.signOut;
    } catch {
      // signOut module unavailable - still clears cookies, which is the main goal
    }
    if (signOutFn) {
      try {
        await signOutFn(getLogtoConfig());
      } catch (err) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
          return response;
        }
        error('[wipe] GET force signOut failed:', err instanceof Error ? err.message : err);
      }
    }
  }
  return response;
}

export async function POST(request: NextRequest) {
  // Block cross-origin requests (CSRF protection).
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const force = request.nextUrl.searchParams.get('force') === 'true';

  const response = clearLogtoCookies(
    request,
    NextResponse.redirect(new URL('/', baseUrl)),
  );

  if (force) {
    let signOutFn: typeof SignOutType | undefined;
    try {
      const mod = await import('@logto/next/server-actions');
      signOutFn = mod.signOut;
    } catch (importError) {
      error('[wipe] force: failed to import @logto/next:',
        importError instanceof Error ? importError.message : importError);
    }
    if (signOutFn) {
      try {
        await signOutFn(getLogtoConfig());
      } catch (err) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
          // signOut throws NEXT_REDIRECT on success, but if we re-throw it,
          // our cookie-cleared response is lost. Return our response instead - // the server-side signOut has already completed.
          return response;
        }
        error('[wipe] force signOut failed:', err instanceof Error ? err.message : err);
      }
    }
  }
  return response;
}
