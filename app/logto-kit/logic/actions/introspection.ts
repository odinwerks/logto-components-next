'use server';

import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import type { OidcIntrospectionResponse } from '../types';

/**
 * Introspects the current session's access token with organization context.
 * The token is derived server-side - never accepted from the client.
 */
export async function introspectTokenWithOrg(): Promise<OidcIntrospectionResponse> {
  const sessionToken = await getTokenForServerAction();
  return introspectToken(sessionToken);
}
