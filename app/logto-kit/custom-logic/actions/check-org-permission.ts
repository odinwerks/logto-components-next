'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig, getManagementApiToken } from '../../../logto';

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: ['*'],
  'nuke-commander': ['launch-nuke', 'abort-nuke'],
  astronaut: ['land-on-moon', 'spacewalk'],
};

function mapRoleToPermissions(roleName: string): string[] {
  return ROLE_PERMISSION_MAP[roleName] ?? [];
}

function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}

export async function checkOrgPermission(
  requiredPermission: string,
  orgId: string | null
): Promise<boolean> {
  try {
    const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);

    if (!isAuthenticated || !claims?.sub) {
      return false;
    }

    if (orgId === null) {
      return false;
    }

    const userId = claims.sub;

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
    
    const userPermissions = roles.flatMap((role) => mapRoleToPermissions(role.name));

    return hasPermission(userPermissions, requiredPermission);
  } catch (error) {
    console.error('[RBAC] checkOrgPermission error:', error);
    return false;
  }
}
