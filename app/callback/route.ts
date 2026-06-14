import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { getLogtoConfig } from '../logto-kit/config';

const OAUTH_ERROR_CODES = new Set([
  'access_denied', 'invalid_request', 'unauthorized_client',
  'unsupported_response_type', 'invalid_scope', 'server_error',
  'temporarily_unavailable', 'interaction_required',
  'login_required', 'consent_required',
]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const oauthError = searchParams.get('error');
  if (oauthError) {
    // Only pass the error code, NOT the error_description - reflecting user-controlled
    // content from the IdP creates a reflected-content vulnerability window.
    // The error code is a fixed OAuth2 enum value (access_denied, invalid_request, etc.).
    const safeCode = OAUTH_ERROR_CODES.has(oauthError) ? oauthError : 'unknown_error';
    redirect(`/?auth_error=${encodeURIComponent(safeCode)}`);
  }

  await handleSignIn(getLogtoConfig(), searchParams);
  redirect('/');
}
