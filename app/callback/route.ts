import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { getLogtoConfig } from '../logto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const oauthError = searchParams.get('error');
  if (oauthError) {
    const errorDescription = searchParams.get('error_description') || oauthError;
    redirect(`/?auth_error=${encodeURIComponent(errorDescription)}`);
  }

  // Defense-in-depth: ensure state parameter is present. The @logto/next SDK
  // validates state internally against the session cookie, so this is a
  // shape check, not a full CSRF guard.
  const state = searchParams.get('state');
  if (!state) {
    redirect(`/?auth_error=${encodeURIComponent('Missing state parameter')}`);
  }

  await handleSignIn(getLogtoConfig(), searchParams);
  redirect('/');
}