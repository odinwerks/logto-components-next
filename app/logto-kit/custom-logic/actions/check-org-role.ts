'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig, getManagementApiToken } from '../../../logto';

export async function checkOrgRole(
  requiredRole: string,
  orgId: string | null
): Promise<boolean> {
  try {
    const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);

    if (!isAuthenticated || !claims?.sub) {
      return false;
    }

    const userId = claims.sub;

    if (orgId === null) {
      return false;
    }

    const userOrgs = claims.organizations as string[] | undefined;
    if (!userOrgs || userOrgs.length === 0) {
      return false;
    }

    if (!userOrgs.includes(orgId)) {
      return false;
    }

    const managementToken = await getManagementApiToken();
    const cleanEndpoint = logtoConfig.endpoint.replace(/\/$/, '');

    const rolesRes = await fetch(
      `${cleanEndpoint}/api/organizations/${orgId}/users/${userId}/roles`,
      {
        headers: {
          Authorization: `Bearer ${managementToken}`,
        },
      }
    );

    if (!rolesRes.ok) {
      console.error('[RBAC] Failed to fetch org roles:', await rolesRes.text());
      return false;
    }

    const roles = (await rolesRes.json()) as Array<{ id: string; name: string }>;
    
    const userRoleNames = roles.map((role) => role.name);
    
    return userRoleNames.includes(requiredRole);
  } catch (error) {
    console.error('[RBAC] checkOrgRole error:', error);
    return false;
  }
}
