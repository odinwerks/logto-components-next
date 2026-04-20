import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../../logto';

const ACTIVE_ORG_COOKIE = 'logto-active-org';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const force = request.nextUrl.searchParams.get('force') === 'true';

  const response = NextResponse.redirect(new URL('/', baseUrl));

  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.startsWith('logto_') || cookie.name === ACTIVE_ORG_COOKIE) {
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
      });
    }
  });

  if (force) {
    const { signOut } = await import('@logto/next/server-actions');
    try {
      await signOut(getLogtoConfig());
    } catch (err) {
      const redirect = err instanceof Error && err.message.includes('NEXT_REDIRECT')
        ? response
        : NextResponse.redirect(new URL('/', baseUrl));
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.startsWith('logto_') || cookie.name === ACTIVE_ORG_COOKIE) {
          redirect.cookies.set(cookie.name, '', {
            maxAge: 0,
            path: '/',
          });
        }
      });
      return redirect;
    }
  }

  return response;
}
