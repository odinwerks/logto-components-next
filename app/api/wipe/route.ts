import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../logto-kit/config';
import { checkSameOrigin } from '../../logto-kit/logic/origin-guard';
import { clearLogtoCookiesFromResponse } from '../../logto-kit/logic/cookie-utils';
import { deleteSessionByCookieValue } from '../../logto-kit/logic/session-wrapper';
import { logEvent } from '../../logto-kit/logic/log';
import { LOG_EVENTS } from '../../lib/log-events';
import { withLogger } from '../../lib/with-logger';
import crypto from 'crypto';

const WIPE_NONCE_COOKIE = 'logto-wipe-nonce';

function clearWipeNonce(response: NextResponse): NextResponse {
  response.cookies.set(WIPE_NONCE_COOKIE, '', { maxAge: 0, path: '/' });
  return response;
}

/**
 * GET clears Logto cookies and redirects home.
 * Browser-navigable stale-cookie recovery requires a middleware-issued nonce.
 * The ?force=true path triggers a server-side signOut and is same-origin protected.
 */
export const GET = withLogger(async (request: NextRequest) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const force = request.nextUrl.searchParams.get('force') === 'true';

  // Protect force-signOut via same-origin, and gate non-force GET wipe via nonce.
  if (force) {
    const originError = checkSameOrigin(request);
    if (originError) {
      logEvent.warn(LOG_EVENTS.AUTH_COOKIE_WIPE, 'Origin rejected (force wipe)', { force });
      return originError;
    }
  } else {
    const nonce = request.nextUrl.searchParams.get('nonce');
    const cookieNonce = request.cookies.get(WIPE_NONCE_COOKIE)?.value;
    if (!nonce || !cookieNonce) {
      logEvent.warn(LOG_EVENTS.AUTH_COOKIE_WIPE, 'Origin rejected (missing nonce)', { force });
      return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
    }
    const h1 = crypto.createHash('sha256').update(nonce).digest();
    const h2 = crypto.createHash('sha256').update(cookieNonce).digest();
    if (!crypto.timingSafeEqual(h1, h2)) {
      logEvent.warn(LOG_EVENTS.AUTH_COOKIE_WIPE, 'Origin rejected (nonce mismatch)', { force });
      return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
    }
  }

  const response = clearWipeNonce(clearLogtoCookiesFromResponse(
    request,
    NextResponse.redirect(new URL('/', baseUrl)),
  ));

  if (force) {
    try {
      await signOut(getLogtoConfig());
    } catch (err) {
      if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
        return response;
      }
      logEvent.error(LOG_EVENTS.AUTH_COOKIE_WIPE, 'GET force signOut failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Server-side cleanup: session data now lives in external storage via the
  // sessionWrapper, so clearing the cookie alone would orphan a live refresh
  // token for up to the session TTL. Delete the stored session too. On the
  // force path signOut() already destroyed it; this call is idempotent.
  try {
    await deleteSessionByCookieValue(
      request.cookies.get(`logto_${getLogtoConfig().appId}`)?.value,
    );
  } catch {
    // Best-effort: the cookie is already cleared; an orphan expires via TTL.
  }
  return response;
});

export const POST = withLogger(async (request: NextRequest) => {
  // Block cross-origin requests (CSRF protection).
  const originError = checkSameOrigin(request);
  if (originError) {
    logEvent.warn(LOG_EVENTS.AUTH_COOKIE_WIPE, 'Origin rejected (POST)', {});
    return originError;
  }

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const force = request.nextUrl.searchParams.get('force') === 'true';

  const response = clearWipeNonce(clearLogtoCookiesFromResponse(
    request,
    NextResponse.redirect(new URL('/', baseUrl)),
  ));

  if (force) {
    try {
      await signOut(getLogtoConfig());
    } catch (err) {
      if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
        // signOut throws NEXT_REDIRECT on success, but if we re-throw it,
        // our cookie-cleared response is lost. Return our response instead -
        // the server-side signOut has already completed.
        return response;
      }
      logEvent.error(LOG_EVENTS.AUTH_COOKIE_WIPE, 'POST force signOut failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Server-side cleanup: session data now lives in external storage via the
  // sessionWrapper, so clearing the cookie alone would orphan a live refresh
  // token for up to the session TTL. Delete the stored session too. On the
  // force path signOut() already destroyed it; this call is idempotent.
  try {
    await deleteSessionByCookieValue(
      request.cookies.get(`logto_${getLogtoConfig().appId}`)?.value,
    );
  } catch {
    // Best-effort: the cookie is already cleared; an orphan expires via TTL.
  }
  return response;
});
