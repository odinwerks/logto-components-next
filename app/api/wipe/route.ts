import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[CookieKiller] Wiping cookies via API route...');

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const response = NextResponse.redirect(new URL('/', baseUrl));

  const cookieNames = [
    'logto',
    'logto.accessToken',
    'logto.refreshToken',
    'logto.idToken',
    'logto.signInSession',
    'accessToken',
    'refreshToken',
    'idToken',
    'signInSession',
  ];

  cookieNames.forEach(name => {
    response.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
    });
  });

  return response;
}
