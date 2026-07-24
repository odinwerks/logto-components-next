import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../logto-kit/config';
import { clearLogtoCookiesFromResponse } from '../logto-kit/logic/cookie-utils';
import { VERIFICATION_COOKIE_NAME } from '../logto-kit/logic/actions/verification-cookie';
import { logEvent } from '../logto-kit/logic/log';
import { LOG_EVENTS } from '../lib/log-events';
import { withLogger } from '../lib/with-logger';

const OAUTH_ERROR_CODES = new Set([
  'access_denied', 'invalid_request', 'unauthorized_client',
  'unsupported_response_type', 'invalid_scope', 'server_error',
  'temporarily_unavailable', 'interaction_required',
  'login_required', 'consent_required',
]);

export const GET = withLogger(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;

  const oauthError = searchParams.get('error');
  if (oauthError) {
    // Only pass the error code, NOT the error_description - reflecting user-controlled
    // content from the IdP creates a reflected-content vulnerability window.
    // The error code is a fixed OAuth2 enum value (access_denied, invalid_request, etc.).
    const safeCode = OAUTH_ERROR_CODES.has(oauthError) ? oauthError : 'unknown_error';
    logEvent.warn(LOG_EVENTS.AUTH_TOKEN_ERROR, 'OAuth callback error', { code: safeCode });
    redirect(`/?auth_error=${encodeURIComponent(safeCode)}`);
  }

  try {
    // NEVER-TOUCH: do NOT add any guard before handleSignIn() — the SDK needs
    // the raw request params to process the OAuth response.
    await handleSignIn(getLogtoConfig(), searchParams);
    logEvent.info(LOG_EVENTS.AUTH_SIGN_IN, 'User signed in', {});
    redirect('/');
  } catch (err) {
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
      throw err;
    }
    logEvent.error(LOG_EVENTS.API_ERROR, 'handleSignIn failed', {
      error: err instanceof Error ? err.message : String(err),
    });

    // BUG-004 fix: Preserve the victim's session when no sign-in was actually
    // in progress for them.
    //
    // `sign_in_session.not_found` = "there is no pending sign-in session for
    // this visitor" → they were NOT mid-sign-in. `sign_in_session.invalid` =
    // the callback's state did not match the stored sign-in session (mismatch
    // / tampering) → again, the victim wasn't conducting this sign-in.
    //
    // Clearing cookies for these two codes enables a forced-logout CSRF: an
    // attacker page auto-submits a cross-site GET form to
    // /callback?code=x&state=y → SameSite=Lax sends the victim's cookie →
    // handleSignIn throws `sign_in_session.not_found` → the catch block wipes
    // the whole session → no-click, reliable forced logout.
    //
    // Instead, send the user home with their cookies fully intact. This is
    // NOT routed through /api/auth/sign-in (which itself clears tokens) and
    // does NOT touch any cookie. The existing NEXT_REDIRECT re-throw above
    // still runs first, so genuine SDK internal redirects are unaffected, and
    // no guard is added before handleSignIn() (NEVER-TOUCH compliance).
    const isNoSignInSession = err instanceof Error
      && err.name === 'LogtoClientError'
      && ((err as { code?: string }).code === 'sign_in_session.not_found'
        || (err as { code?: string }).code === 'sign_in_session.invalid');
    if (isNoSignInSession) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(new URL('/', baseUrl));
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const response = clearLogtoCookiesFromResponse(
      request,
      NextResponse.redirect(new URL('/api/auth/sign-in', baseUrl)),
    );
    // Belt-and-suspenders: clear verification cookie even if not in request
    // cookies (the predicate in `clearLogtoCookiesFromResponse` only clears
    // cookies present on the incoming request — this guarantees the seal is
    // removed regardless). Harmless defense-in-depth; matches existing style.
    response.cookies.set(VERIFICATION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return response;
  }
});
