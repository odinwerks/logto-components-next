import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { getLogtoConfig } from '../logto-kit/config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const oauthError = searchParams.get('error');
  if (oauthError) {
    // Only pass the error code, NOT the error_description — reflecting user-controlled
    // content from the IdP creates a reflected-content vulnerability window.
    // The error code is a fixed OAuth2 enum value (access_denied, invalid_request, etc.).
    redirect(`/?auth_error=${encodeURIComponent(oauthError)}`);
  }

  // handleSignIn is smart enough to detect missing OAuth params and
  // initiate the sign-in flow when the user isn't in an active OAuth flow.
  await handleSignIn(getLogtoConfig(), searchParams);
  redirect('/');
}
