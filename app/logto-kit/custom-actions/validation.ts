'use server';

import { getCleanEndpoint } from '../logic/utils';
import { decodeLogtoAccessToken } from '../logic/guards';
import { warn } from '../logic/log';

interface RbacUserData {
  organizations: string[];
  asOrg: string | null;
  organizationPermissions?: string[];
}

interface RbacValidationResult {
  ok: boolean;
  error?: 'NO_ORG_SELECTED' | 'ORG_NOT_MEMBER' | 'PERMISSION_DENIED' | 'ROLE_DENIED' | 'VALIDATION_ERROR' | 'ACTION_NOT_FOUND' | 'TOKEN_INVALID';
  detail?: string;
}

/**
 * @deprecated Use getLogtoContext(getLogtoConfig(), { fetchUserInfo: true }) instead.
 * This function performed a redundant fetch of the OIDC /me endpoint and also fetched
 * organization permissions internally, leading to double-fetching when used in the
 * Protected Actions API route. The route now uses getLogtoContext for user info and
 * getOrganizationUserPermissions directly for permissions.
 */
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

  if (asOrg) {
    try {
      // Use @logto/js-based decode (base64url-correct) to extract sub from token.
      // The token was already introspected and validated by the caller (/api/protected).
      const claims = decodeLogtoAccessToken(token);
      if (claims.sub) {
        const { getOrganizationUserPermissions } = await import('../logic/actions');
        const permResult = await getOrganizationUserPermissions(asOrg);
        organizationPermissions = permResult.ok ? permResult.data : [];
      }
    } catch (error) {
      warn('[fetchUserRbacData] Failed to get org permissions:', error);
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
