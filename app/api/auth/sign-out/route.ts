import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';
import { checkSameOrigin } from '../../../logto-kit/logic/origin-guard';

/**
 * GET is no longer supported. Previously this allowed CSRF-based sign-out
 * via a cross-origin image tag or link. POST + origin-check stops that.
 */
export async function GET() {
  return NextResponse.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  try {
    await signOut(getLogtoConfig());
  } catch (err) {
    // signOut() throws NEXT_REDIRECT on success — let Next.js handle it.
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) throw err;
    // Any other error: log server-side, return safe redirect (don't expose details).
    console.error('[sign-out] signOut failed, clearing cookies and redirecting:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL('/', baseUrl));
  }

  // Defensive fallback — signOut() should always throw NEXT_REDIRECT; this is unreachable.
  return NextResponse.redirect(new URL('/', baseUrl));
}
