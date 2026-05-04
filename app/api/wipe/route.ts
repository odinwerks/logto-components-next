import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../../logto';
import { checkSameOrigin } from '../../logto-kit/logic/origin-guard';
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
 * This is a convenience handler for browser navigation (not CSRF-safe).
 * For CSRF-safe cookie wiping, use POST instead.
 */
export async function GET(request: NextRequest) {
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
      console.error('[wipe] force: failed to import @logto/next:',
        importError instanceof Error ? importError.message : importError);
    }
    if (signOutFn) {
      try {
        await signOutFn(getLogtoConfig());
      } catch (err) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) throw err; // propagates to Next.js
        console.error('[wipe] force signOut failed:', err instanceof Error ? err.message : err);
      }
    }
  }
  return response;
}

export async function POST(request: NextRequest) {
  // Block cross-origin requests (CSRF protection).
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  // FIX: was process.env.APP_URL (undefined in .env) — BASE_URL is correct.
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
      console.error('[wipe] force: failed to import @logto/next:',
        importError instanceof Error ? importError.message : importError);
    }
    if (signOutFn) {
      try {
        await signOutFn(getLogtoConfig());
      } catch (err) {
        if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) throw err; // propagates to Next.js
        console.error('[wipe] force signOut failed:', err instanceof Error ? err.message : err);
      }
    }
  }
  return response;
}
