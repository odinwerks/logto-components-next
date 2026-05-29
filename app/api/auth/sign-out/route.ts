import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto-kit/config';
import { error } from '../../../logto-kit/logic/log';

export async function POST(request: NextRequest) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  try {
    await signOut(getLogtoConfig());
  } catch (err) {
    // signOut() throws NEXT_REDIRECT on success — let Next.js handle it.
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) throw err;
    // Any other error: log server-side, return safe redirect (don't expose details).
    error('[sign-out] signOut failed, clearing cookies and redirecting:', err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL('/', baseUrl));
  }

  // Defensive fallback — signOut() should always throw NEXT_REDIRECT; this is unreachable.
  return NextResponse.redirect(new URL('/', baseUrl));
}
