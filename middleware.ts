import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/edge';
import { logtoConfig } from './app/logto';

const publicPaths = ['/', '/callback', '/api/public', '/_next', '/favicon.ico'];
const client = new LogtoClient(logtoConfig);

export async function middleware(request: NextRequest) {
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
    console.error('Authentication error:', error);
    // Fallback to sign-in on error
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
