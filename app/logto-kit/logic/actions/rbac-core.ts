import 'server-only';

import { getManagementApiToken, getLogtoConfig } from '../../config';
import { debugLog } from '../debug';
import { warn } from '../log';
import { assertSafeLogtoId } from '../guards';
import { plainCode } from '../errors';
import type { UserRole, OrgRoleScope } from '../types';
import { fetchAllManagementPages } from './management-request';

export interface OrgRolePermissionsResult {
  roles: UserRole[];
  permissions: string[];
  rolePermissions: Record<string, string[]>;
}

/** Only explicit provider non-membership codes may turn a 422 into this code. */
export function isConfirmedOrganizationNonMembership(status: number, body: string): boolean {
  if (status !== 422) return false;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const code = typeof parsed.code === 'string'
      ? parsed.code
      : typeof parsed.error === 'string' ? parsed.error : undefined;
    return code === 'organization.user_not_exists' ||
      code === 'organization.user_not_member' ||
      code === 'organization_not_member' ||
      code === 'user_not_in_organization';
  } catch {
    return false;
  }
}

/**
 * Token-independent live org RBAC core.
 *
 * The caller derives the actor `sub` from an already-authenticated server-side
 * source. This function never retrieves or introspects tokens.
 *
 * It validates both identifiers before URL interpolation, fetches live
 * membership and paginated role scopes, preserves the legacy union order, and
 * records permissions per role. It fails closed when every scope fetch fails.
 */
export async function fetchOrgRolePermissions(
  orgId: string,
  sub: string,
): Promise<OrgRolePermissionsResult> {
  assertSafeLogtoId(orgId, 'orgId');
  assertSafeLogtoId(sub, 'userId');

  const m2mToken = await getManagementApiToken();
  const endpoint = getLogtoConfig().endpoint.replace(/\/$/, '');

  const rolesUrl = `${endpoint}/api/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(sub)}/roles`;
  debugLog(`[fetchOrgRolePermissions] Fetching org roles: ${rolesUrl}`);

  const rolesResult = await fetchAllManagementPages<UserRole>(rolesUrl, { token: m2mToken });

  if (!rolesResult.ok) {
    const rolesRes = rolesResult.response;
    const text = await rolesRes.text().catch(() => '');
    warn(`[fetchOrgRolePermissions] Roles endpoint returned ${rolesRes.status}: ${text.substring(0, 200)}`);
    if (rolesRes.status === 403 || rolesRes.status === 404 || isConfirmedOrganizationNonMembership(rolesRes.status, text)) {
      throw plainCode('ORG_NOT_MEMBER');
    }
    throw new Error(`Management API error: HTTP ${rolesRes.status}`);
  }

  const roles = rolesResult.data;
  debugLog(`[fetchOrgRolePermissions] User ${sub} has ${roles.length} roles in org ${orgId}`);

  if (roles.length === 0) {
    return {
      roles: [],
      permissions: [],
      rolePermissions: Object.create(null) as Record<string, string[]>,
    };
  }

  const scopeResults = await Promise.allSettled(
    roles.map(async (role) => {
      const scopesUrl = `${endpoint}/api/organization-roles/${encodeURIComponent(role.id)}/scopes`;
      const scopesResult = await fetchAllManagementPages<OrgRoleScope>(scopesUrl, { token: m2mToken });

      if (!scopesResult.ok) {
        const scopesRes = scopesResult.response;
        const text = await scopesRes.text().catch(() => '');
        warn(`[fetchOrgRolePermissions] Scopes endpoint returned ${scopesRes.status} for role ${role.id}: ${text.substring(0, 200)}`);
        throw new Error(`Scopes fetch failed for role ${role.id}: ${scopesRes.status}`);
      }

      return scopesResult.data;
    })
  );

  const seen = new Set<string>();
  const permissions: string[] = [];
  const rolePermissions = Object.create(null) as Record<string, string[]>;
  let successfulFetches = 0;

  for (let i = 0; i < scopeResults.length; i++) {
    const result = scopeResults[i];
    if (result.status === 'fulfilled') {
      successfulFetches++;
      const roleId = roles[i].id;
      const roleScopes: string[] = [];
      const roleSeen = new Set<string>();
      for (const scope of result.value) {
        if (scope.name && !seen.has(scope.name)) {
          seen.add(scope.name);
          permissions.push(scope.name);
        }
        if (scope.name && !roleSeen.has(scope.name)) {
          roleSeen.add(scope.name);
          roleScopes.push(scope.name);
        }
      }
      rolePermissions[roleId] = roleScopes;
    } else {
      warn(`[fetchOrgRolePermissions] Scope fetch failed for a role: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  }

  if (roles.length > 0 && successfulFetches === 0) {
    throw plainCode('FETCH_FAILED');
  }

  debugLog(`[fetchOrgRolePermissions] Effective permissions for user ${sub} in org ${orgId}:`, permissions);
  return { roles, permissions, rolePermissions };
}
