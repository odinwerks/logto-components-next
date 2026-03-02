import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[CookieKiller] Wiping cookies via API route...');

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
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
