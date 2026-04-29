'use server';

import { getOrganizationToken } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';
import { debugLog } from '../debug';
import { decodeLogtoAccessToken } from '../guards';

/**
 * Gets the user's permissions for a specific organization.
 * Uses @logto/js::decodeAccessToken (base64url-correct) instead of
 * the previous manual Buffer.from(..., 'base64') decode that silently
 * produced garbage for tokens containing '-' or '_' characters.
 */
export async function getOrganizationUserPermissions(orgId: string): Promise<string[]> {
  try {
    const orgToken = await getOrganizationToken(getLogtoConfig(), orgId);
    if (!orgToken) {
      console.warn(`[getOrganizationUserPermissions] No token for org ${orgId}`);
      return [];
    }

    const claims = decodeLogtoAccessToken(orgToken);
    debugLog(`[getOrganizationUserPermissions] Org token scope for ${orgId}:`, claims.scope);

    const permissions = ((claims.scope as string | undefined) ?? '')
      .split(' ')
      .filter(Boolean)
      .filter((s: string) => !s.startsWith('openid'));

    debugLog(`[getOrganizationUserPermissions] Parsed permissions for ${orgId}:`, permissions);
    return permissions;
  } catch (error) {
    console.error(`[getOrganizationUserPermissions] Failed for org ${orgId}:`, error);
    return [];
  }
}
