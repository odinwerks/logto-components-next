import { signIn } from '@logto/next/server-actions';
import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../../../logto-kit/config';

export async function GET(_request: NextRequest) {
  const config = getLogtoConfig();
  await signIn(config);
  // Defensive fallback - signIn() should always throw NEXT_REDIRECT.
  // This line is unreachable in normal operation but prevents an implicit
  // empty 200 response if the SDK behaviour changes.
  return NextResponse.redirect(new URL('/callback', config.baseUrl));
}
