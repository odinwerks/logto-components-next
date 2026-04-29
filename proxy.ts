import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/edge';
import { getLogtoConfig } from './app/logto';

const STALE_COOKIE_ERROR = 'Cookies can only be modified';

// These paths are public (no session needed). They are either:
//   - POST-only with an origin check (wipe, sign-out) — safe even without auth
//   - Auth-initiation routes (sign-in, callback) — must be reachable pre-auth
// These paths bypass the auth middleware. They are either:
//   - Auth-initiation routes that must be reachable before a session exists.
//   - POST-only endpoints with their own origin-guard (wipe, sign-out).
//     They don't need session authentication, but they DO enforce same-origin
//     via checkSameOrigin() inside the handler itself.
const PUBLIC_PATHS = [
  '/callback',
  '/api/auth/sign-in',
  '/api/auth/sign-out',
  '/api/wipe',
];

const getClient = () => new LogtoClient(getLogtoConfig());

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths (exact match or with trailing slash)
  if (PUBLIC_PATHS.some(path => pathname === path || pathname === path + '/')) {
    return NextResponse.next();
  }

  // Skip Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  try {
    // Auth check - use fetchUserInfo to detect deleted accounts
    const context = await getClient().getLogtoContext(request, { fetchUserInfo: true });

    if (!context.isAuthenticated) {
      // Not authenticated - redirect to sign-in
      return NextResponse.redirect(new URL('/api/auth/sign-in', request.url));
    }

    // Authenticated - proceed
    return NextResponse.next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle stale cookie error
    if (errorMessage.includes(STALE_COOKIE_ERROR)) {
      console.log('[CookieKiller] 🔧 Stale cookies detected, redirecting to wipe...');
      // /api/wipe is POST-only now; sign-in clears the stale cookie state.
      return NextResponse.redirect(new URL('/api/auth/sign-in', request.url));
    }

    // Any other error - redirect to sign-in
    console.error('[Proxy] Auth error:', errorMessage);
    return NextResponse.redirect(new URL('/api/auth/sign-in', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
