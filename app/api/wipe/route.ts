import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@logto/next/server-actions';
import { logtoConfig } from '../../logto';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const force = request.nextUrl.searchParams.get('force') === 'true';

  console.log('[CookieKiller] Wiping cookies via API route...', { force });

  // If force=true, sign out from Logto first (invalidates real session)
  if (force) {
    console.log('[CookieKiller] Force flag set, signing out from Logto...');
    try {
      await signOut(logtoConfig);
    } catch (error) {
      console.error('[CookieKiller] Sign-out error:', error);
    }
  }

  // Clear cookies and redirect to home
  const response = NextResponse.redirect(new URL('/', baseUrl));

  // Dynamically clear ALL cookies that start with "logto_"
  // Logto SDK uses dynamic cookie names like "logto_<appId>"
  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('logto_')) {
      console.log('[CookieKiller] Clearing cookie:', cookie.name);
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
      });
    }
  });

  return response;
}
