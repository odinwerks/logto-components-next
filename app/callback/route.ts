import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../logto-kit/config';
import { error } from '../logto-kit/logic/log';
import { VERIFICATION_COOKIE_NAME } from '../logto-kit/logic/actions/verification-cookie';

const OAUTH_ERROR_CODES = new Set([
  'access_denied', 'invalid_request', 'unauthorized_client',
  'unsupported_response_type', 'invalid_scope', 'server_error',
  'temporarily_unavailable', 'interaction_required',
  'login_required', 'consent_required',
]);

const ACTIVE_ORG_COOKIE = 'logto-active-org';

function clearLogtoCookies(request: NextRequest, response: NextResponse): NextResponse {
  request.cookies.getAll().forEach(cookie => {
    if (
      cookie.name.startsWith('logto_') ||
      cookie.name === ACTIVE_ORG_COOKIE ||
      cookie.name === VERIFICATION_COOKIE_NAME
    ) {
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
    }
  });
  // Belt-and-suspenders: clear verification cookie even if not in request cookies.
  response.cookies.set(VERIFICATION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const oauthError = searchParams.get('error');
  if (oauthError) {
    // Only pass the error code, NOT the error_description - reflecting user-controlled
    // content from the IdP creates a reflected-content vulnerability window.
    // The error code is a fixed OAuth2 enum value (access_denied, invalid_request, etc.).
    const safeCode = OAUTH_ERROR_CODES.has(oauthError) ? oauthError : 'unknown_error';
    redirect(`/?auth_error=${encodeURIComponent(safeCode)}`);
  }

  try {
    await handleSignIn(getLogtoConfig(), searchParams);
    redirect('/');
  } catch (err) {
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
      throw err;
    }
    error('[callback] handleSignIn failed:', err instanceof Error ? err.message : err);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const response = clearLogtoCookies(
      request,
      NextResponse.redirect(new URL('/api/auth/sign-in', baseUrl)),
    );
    return response;
  }
}
