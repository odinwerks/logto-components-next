import { signIn } from '@logto/next/server-actions';
import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../../../logto-kit/config';

export async function GET(request: NextRequest) {
  await signIn(getLogtoConfig());
  // Defensive fallback - signIn() should always throw NEXT_REDIRECT.
  // This line is unreachable in normal operation but prevents an implicit
  // empty 200 response if the SDK behaviour changes.
  return NextResponse.redirect(new URL('/callback', getLogtoConfig().baseUrl));
}
