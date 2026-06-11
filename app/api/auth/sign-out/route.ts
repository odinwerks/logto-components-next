import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto-kit/config';
import { error } from '../../../logto-kit/logic/log';

const ALLOWED_ORIGINS = (() => {
  const urls = [
    process.env.BASE_URL,
    process.env.PUBLIC_BASE_URL,
    process.env.APP_URL,
    process.env.LOGTO_ENDPOINT,
    process.env.LOGTO_M2M_RESOURCE,
  ].filter(Boolean) as string[];
  urls.push('http://localhost:3000');
  return [...new Set(urls.map((url) => new URL(url).origin))];
})();

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  // CSRF: reject cross-origin POSTs. Requests without Origin header
  // (e.g. curl, non-browser clients) pass through.
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  try {
    await signOut(getLogtoConfig());
  } catch (err) {
    // signOut() throws NEXT_REDIRECT on success - let Next.js handle it.
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) throw err;
    // Any other error: log server-side, return safe redirect (don't expose details).
    error('[sign-out] signOut failed, clearing cookies and redirecting:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL('/', baseUrl));
  }

  // Defensive fallback - signOut() should always throw NEXT_REDIRECT; this is unreachable.
  return NextResponse.redirect(new URL('/', baseUrl));
}
