'use server';

import type { OidcIntrospectionResponse } from '../types';
import { introspectToken } from '../utils';

/**
 * Introspects a token with organization context.
 * @param token - The access token to introspect.
 * @returns The OIDC introspection response.
 */
export async function introspectTokenWithOrg(
  token: string,
): Promise<OidcIntrospectionResponse> {
  return introspectToken(token);
}
