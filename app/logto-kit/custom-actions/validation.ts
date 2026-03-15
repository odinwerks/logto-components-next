'use server';

import { logtoConfig, getManagementApiToken } from '../../logto';
import { getCleanEndpoint } from '../logic/utils';

export interface RbacUserData {
  organizations: string[];
  asOrg: string | null;
}

export interface RbacValidationResult {
  ok: boolean;
  error?: 'NO_ORG_SELECTED' | 'ORG_NOT_MEMBER' | 'PERMISSION_DENIED' | 'ROLE_DENIED' | 'VALIDATION_ERROR' | 'ACTION_NOT_FOUND' | 'TOKEN_INVALID';
  detail?: string;
}


const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: ['*'],
  'nuke-commander': ['launch-nuke', 'abort-nuke'],
  astronaut: ['land-on-moon', 'spacewalk'],
};

function mapRoleToPermissions(roleName: string): string[] {
  return ROLE_PERMISSION_MAP[roleName] || [];
}

function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}

export async function fetchUserRbacData(token: string, overrideOrgId?: string | null): Promise<RbacUserData> {
  const cleanEndpoint = getCleanEndpoint();
  const res = await fetch(`${cleanEndpoint}/oidc/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user data: ${res.status}`);
  }

  const userInfo = await res.json();
  const userOrgs = (userInfo.organizations as string[]) || [];
  
  let asOrg: string | null;
  if (overrideOrgId !== undefined) {
    asOrg = overrideOrgId;
  } else {
    const customData = (userInfo.custom_data as Record<string, unknown>) || {};
    const prefs = (customData.Preferences as { asOrg?: string | null }) || {};
    asOrg = prefs.asOrg ?? null;
  }

  return {
    organizations: userOrgs,
    asOrg,
  };
}

export async function validateOrgMembership(userOrgs: string[], asOrg: string | null): Promise<RbacValidationResult> {
  if (!asOrg) {
    return { ok: false, error: 'NO_ORG_SELECTED', detail: 'User has no organization selected' };
  }

  if (!userOrgs.includes(asOrg)) {
    return { ok: false, error: 'ORG_NOT_MEMBER', detail: 'Selected organization not in user orgs' };
  }

  return { ok: true };
}

export async function checkPermissionInOrg(
  userId: string,
  orgId: string,
  requiredPermission: string
): Promise<boolean> {
  try {
    const managementToken = await getManagementApiToken();
    const cleanEndpoint = getCleanEndpoint();

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
    console.error('[RBAC] checkPermissionInOrg error:', error);
    return false;
  }
}

export async function checkRoleInOrg(
  userId: string,
  orgId: string,
  requiredRole: string
): Promise<boolean> {
  try {
    const managementToken = await getManagementApiToken();
    const cleanEndpoint = getCleanEndpoint();

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
    const userRoleNames = roles.map((r) => r.name);

    return userRoleNames.includes(requiredRole);
  } catch (error) {
    console.error('[RBAC] checkRoleInOrg error:', error);
    return false;
  }
}

export async function validateRbac(
  userId: string,
  userData: RbacUserData,
  options: {
    perm?: string | string[];
    role?: string | string[];
    requireAll?: boolean;
  } = {}
): Promise<RbacValidationResult> {
  const { perm, role, requireAll = true } = options;

  const orgValidation = await validateOrgMembership(userData.organizations, userData.asOrg);
  if (!orgValidation.ok) {
    return orgValidation;
  }

  const orgId = userData.asOrg!;

  let permPassed = true;
  let rolePassed = true;
  let permFailed = false;
  let roleFailed = false;

  if (perm) {
    const perms = Array.isArray(perm) ? perm : [perm];
    const results = await Promise.all(perms.map((p) => checkPermissionInOrg(userId, orgId, p)));
    permPassed = requireAll ? results.every(Boolean) : results.some(Boolean);
    permFailed = !permPassed;
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    const results = await Promise.all(roles.map((r) => checkRoleInOrg(userId, orgId, r)));
    rolePassed = requireAll ? results.every(Boolean) : results.some(Boolean);
    roleFailed = !rolePassed;
  }

  let finalPass: boolean;
  if (perm && role) {
    finalPass = requireAll ? (permPassed && rolePassed) : (permPassed || rolePassed);
  } else if (perm) {
    finalPass = permPassed;
  } else if (role) {
    finalPass = rolePassed;
  } else {
    finalPass = true;
  }

  if (!finalPass) {
    let error: 'PERMISSION_DENIED' | 'ROLE_DENIED';
    if (perm && role) {
      error = permFailed ? 'PERMISSION_DENIED' : 'ROLE_DENIED';
    } else if (perm) {
      error = 'PERMISSION_DENIED';
    } else {
      error = 'ROLE_DENIED';
    }

    const detail = error === 'PERMISSION_DENIED'
      ? `Missing permission: ${Array.isArray(perm) ? perm.join(', ') : perm}`
      : `Missing role: ${Array.isArray(role) ? role.join(', ') : role}`;

    return { ok: false, error, detail };
  }

  return { ok: true };
}
