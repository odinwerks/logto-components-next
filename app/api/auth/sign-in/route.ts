import { signIn } from '@logto/next/server-actions';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getLogtoConfig } from '../../../logto-kit/config';

const LANG_COOKIE_NAME = 'lang-mode';

export async function GET(_request: NextRequest) {
  const config = getLogtoConfig();
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANG_COOKIE_NAME)?.value;

  await signIn(
    config,
    cookieLang
      ? {
          redirectUri: new URL('/callback', config.baseUrl).toString(),
          extraParams: { ui_locales: cookieLang },
        }
      : undefined
  );
  // Defensive fallback - signIn() should always throw NEXT_REDIRECT.
  // This line is unreachable in normal operation but prevents an implicit
  // empty 200 response if the SDK behaviour changes.
  return NextResponse.redirect(new URL('/callback', process.env.BASE_URL || 'http://localhost:3000'));
}
