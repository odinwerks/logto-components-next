'use server';

import { getOrganizationToken } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';
import { debugLog } from '../debug';

/**
 * Gets the user's permissions for a specific organization.
 * @param orgId - The organization ID.
 * @returns Array of permission strings.
 */
export async function getOrganizationUserPermissions(orgId: string): Promise<string[]> {
  try {
    const orgToken = await getOrganizationToken(getLogtoConfig(), orgId);
    if (!orgToken) {
      console.warn(`[getOrganizationUserPermissions] No token for org ${orgId}`);
      return [];
    }

    const parts = orgToken.split('.');
    if (parts.length !== 3) return [];

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    debugLog(`[getOrganizationUserPermissions] Org token scope for ${orgId}:`, payload.scope);

    const permissions = (payload.scope ?? '')
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
