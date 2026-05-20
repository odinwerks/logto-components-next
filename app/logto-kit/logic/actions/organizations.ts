'use server';

import LogtoClient from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';
import { debugLog } from '../debug';
import { assertSafeLogtoId, decodeLogtoAccessToken } from '../guards';
import { safeAction, type DataResult } from './safe';
import { warn } from '../log';

/**
 * Gets the user's permissions for a specific organization.
 *
 * Makes a direct HTTP call to Logto's /oidc/token endpoint (refresh_token grant
 * with organization_id) instead of going through the SDK's getOrganizationToken,
 * which caches access tokens in a cookie-persisted `accessTokenMap` that
 * survives page refreshes.
 *
 * The direct call is read-only from the cookie perspective — it does not
 * trigger Next.js's automatic revalidation for cookie-modifying server actions,
 * avoiding the render loop that occurs when clearAccessToken() + fetching a new
 * token each write cookies inside a single action.
 *
 * Token decoding uses @logto/js::decodeAccessToken (base64url-correct).
 */
export async function getOrganizationUserPermissions(orgId: string): Promise<DataResult<string[]>> {
  return safeAction(async () => {
    assertSafeLogtoId(orgId, 'orgId');

    const config = getLogtoConfig();
    const logtoClient = new LogtoClient(config);
    const nodeClient = await logtoClient.createNodeClient();

    // Read the refresh token from the session (read-only, no cookie write)
    const refreshToken = await nodeClient.getRefreshToken();
    if (!refreshToken) {
      warn('[getOrganizationUserPermissions] No refresh token in session');
      throw new Error('UNAUTHORIZED');
    }

    // Direct call to Logto's token endpoint bypasses the SDK's
    // cookie-persisted accessTokenMap cache entirely. Every call gets a
    // fresh token with the user's current organization permissions.
    const endpoint = config.endpoint.replace(/\/$/, '');
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      throw new Error('Logto endpoint must use HTTPS in production');
    }
    const tokenEndpoint = `${endpoint}/oidc/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.appId,
      refresh_token: refreshToken,
      organization_id: orgId,
    });

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.appId}:${config.appSecret}`).toString('base64')}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      warn(`[getOrganizationUserPermissions] Token endpoint returned ${res.status}: ${errText.substring(0, 200)}`);
      throw new Error('UNAUTHORIZED');
    }

    const data = await res.json();
    const orgToken = data.access_token as string | undefined;
    if (!orgToken) {
      warn('[getOrganizationUserPermissions] No access_token in response');
      throw new Error('UNAUTHORIZED');
    }

    const claims = decodeLogtoAccessToken(orgToken);
    debugLog(`[getOrganizationUserPermissions] Org token scope for ${orgId}:`, claims.scope);

    const permissions = ((claims.scope as string | undefined) ?? '')
      .split(' ')
      .filter(Boolean)
      .filter((s: string) => !s.startsWith('openid'));

    debugLog(`[getOrganizationUserPermissions] Parsed permissions for ${orgId}:`, permissions);
    return permissions;
  });
}
