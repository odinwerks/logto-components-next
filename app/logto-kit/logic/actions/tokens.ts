'use server';

import { getAccessToken } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../config';

/**
 * Gets an access token for use in server actions.
 * @returns The access token string.
 * @throws Error if no token is available.
 */
export async function getTokenForServerAction(): Promise<string> {
  const token = await getAccessToken(getLogtoConfig());
  if (!token) throw new Error('No access token available for Account API');
  return token;
}

/**
 * Convenience alias for getTokenForServerAction.
 * Note: may return a cached token from the SDK - name preserved for compatibility.
 */
export async function getFreshAccessToken(): Promise<string> {
  return await getTokenForServerAction();
}
