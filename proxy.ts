import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/edge';
import { logtoConfig } from './app/logto';
import { wipeCookiesInMiddleware } from './app/logto-kit/src/logic/cookie-killer';

const STALE_COOKIE_ERROR = 'Cookies can only be modified in a Server Action or Route Handler';

const publicPaths = ['/', '/callback', '/api/public', '/_next', '/favicon.ico'];
const client = new LogtoClient(logtoConfig);

function wipeAndRetry(request: NextRequest) {
  console.log('[CookieKiller] Detected stale cookies, wiping and retrying...');
  const response = NextResponse.next();
  wipeCookiesInMiddleware(request, response);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Skip API routes for now (except auth-related)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  try {
    // Get authentication context
    const context = await client.getLogtoContext(request);

    // If authenticated, proceed
    if (context.isAuthenticated) {
      return NextResponse.next();
    }

    // Not authenticated - initiate sign-in
    const signInHandler = client.handleSignIn({
      redirectUri: `${logtoConfig.baseUrl}/callback`,
    });
    return await signInHandler(request);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Only wipe cookies on the specific stale cookie error
    if (errorMessage.includes(STALE_COOKIE_ERROR)) {
      return wipeAndRetry(request);
    }

    // All other errors - don't touch cookies, fallback to sign-in
    console.error('Authentication error:', errorMessage);
    const signInHandler = client.handleSignIn({
      redirectUri: `${logtoConfig.baseUrl}/callback`,
    });
    return await signInHandler(request);
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
