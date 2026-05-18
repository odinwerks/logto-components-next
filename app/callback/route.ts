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

  await handleSignIn(getLogtoConfig(), searchParams);
  redirect('/');
}