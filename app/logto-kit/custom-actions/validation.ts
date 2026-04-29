'use server';

import { getCleanEndpoint } from '../logic/utils';

interface RbacUserData {
  organizations: string[];
  asOrg: string | null;
  organizationPermissions?: string[]; // Permission scopes from organization token
}

interface RbacValidationResult {
  ok: boolean;
  error?: 'NO_ORG_SELECTED' | 'ORG_NOT_MEMBER' | 'PERMISSION_DENIED' | 'ROLE_DENIED' | 'VALIDATION_ERROR' | 'ACTION_NOT_FOUND' | 'TOKEN_INVALID';
  detail?: string;
}

export async function fetchUserRbacData(token: string, overrideOrgId?: string | null): Promise<RbacUserData> {
  const cleanEndpoint = await getCleanEndpoint();
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

  let organizationPermissions: string[] | undefined;

  // If user has active org, get permissions via Management API
  if (asOrg) {
    try {
      const { getOrganizationUserPermissions } = await import('../logic/actions');
      // Extract userId from JWT token
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const userId = payload.sub;
        if (userId) {
          organizationPermissions = await getOrganizationUserPermissions(asOrg);
        }
      }
    } catch (error) {
      console.warn('[fetchUserRbacData] Failed to get org permissions:', error);
    }
  }

  return {
    organizations: userOrgs,
    asOrg,
    organizationPermissions,
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




