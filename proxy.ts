import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/edge';
import { getLogtoConfig } from './app/logto-kit/config';

const STALE_COOKIE_ERROR = 'Cookies can only be modified';

// These paths are public (no session needed). They are either:
//   - Cookie/session management (wipe, sign-out) - GET for convenience, POST for CSRF safety
//   - Auth-initiation routes (sign-in, callback) - must be reachable pre-auth
// These paths bypass the auth middleware. They are either:
//   - Auth-initiation routes that must be reachable before a session exists.
//   - Cookie/session endpoints that don't need session authentication, but
//     their POST handlers enforce same-origin via checkSameOrigin() for CSRF safety.
//     GET handlers provide convenience for browser navigation.
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
      // /api/wipe clears stale Logto cookies and redirects home.
      return NextResponse.redirect(new URL('/api/wipe', request.url));
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
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
