import { NextRequest, NextResponse } from 'next/server';
import { logtoConfig } from '../../logto';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const force = request.nextUrl.searchParams.has('force') || request.nextUrl.searchParams.get('force') === 'true';

  console.log('[CookieKiller] Wiping cookies via API route...', { force });

  // Clear all logto cookies first
  const response = NextResponse.redirect(new URL('/', baseUrl));

  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('logto_')) {
      console.log('[CookieKiller] Clearing cookie:', cookie.name);
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
      });
    }
  });

  if (force) {
    console.log('[CookieKiller] Force flag set, signing out from Logto...');
    // Let the SDK handle the redirect - this will throw NEXT_REDIRECT which Next.js will handle
    const { signOut } = await import('@logto/next/server-actions');
    await signOut(logtoConfig);
  }

  return response;
}
