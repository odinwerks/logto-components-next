import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../../logto';
import { checkSameOrigin } from '../../logto-kit/logic/origin-guard';

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
 * GET is intentionally rejected.
 * Previously this was a GET endpoint, which allowed CSRF-based logout via
 * <img src="/api/wipe"> from any page. POST + origin-check eliminates that.
 */
export async function GET() {
  return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
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
    const { signOut } = await import('@logto/next/server-actions');
    try {
      await signOut(getLogtoConfig());
    } catch (err) {
      const redirect = err instanceof Error && err.message.includes('NEXT_REDIRECT')
        ? response
        : clearLogtoCookies(request, NextResponse.redirect(new URL('/', baseUrl)));
      return redirect;
    }
  }

  return response;
}
