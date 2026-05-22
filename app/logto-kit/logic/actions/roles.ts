'use server';

import { getManagementApiToken } from '../../../logto';
import { getCleanEndpoint, introspectToken } from '../utils';
import { debugLog } from '../debug';
import { assertSafeUserId, assertSafeLogtoId } from '../guards';
import { safeAction, type DataResult } from './safe';
import type { UserRole, PersonalPermission, RoleScope } from '../types';
import { warn } from '../log';
import { getTokenForServerAction } from './tokens';
import { sanitize } from '../errors';

export async function getRoleDetails(roleId: string): Promise<DataResult<UserRole>> {
  return safeAction(async () => {
    assertSafeLogtoId(roleId, 'roleId');
    const token = await getManagementApiToken();
    const endpoint = getCleanEndpoint();
    const url = `${endpoint}/api/roles/${encodeURIComponent(roleId)}`;

    debugLog(`[getRoleDetails] Fetching role ${roleId} from ${url}`);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      warn(`[getRoleDetails] Management API returned ${res.status}: ${text.substring(0, 300)}`);
      throw new Error(`Management API returned ${res.status}`);
    }

    const data = (await res.json()) as UserRole;
    debugLog(`[getRoleDetails] Parsed role ${data.id}: ${data.name}`);
    return data;
  });
}

/**
 * Fetches the roles assigned to the current user within a specific organization.
 * Uses the user-scoped endpoint so only the caller's own roles are returned.
 * No name-matching needed. Each role includes its real UUID and description.
 */
export async function getOrganizationUserRoles(orgId: string): Promise<DataResult<UserRole[]>> {
  return safeAction(async () => {
    assertSafeLogtoId(orgId, 'orgId');

    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    if (!introspection.active) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }
    const userId = introspection.sub;
    if (!userId) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }
    assertSafeUserId(userId);

    const token = await getManagementApiToken();
    const endpoint = getCleanEndpoint();
    const url = `${endpoint}/api/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/roles`;

    debugLog(`[getOrganizationUserRoles] Fetching roles for user ${userId} in org ${orgId}`);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      warn(`[getOrganizationUserRoles] Management API returned ${res.status}: ${text.substring(0, 300)}`);
      throw new Error(`Management API returned ${res.status}`);
    }

    const data = (await res.json()) as UserRole[];
    debugLog(`[getOrganizationUserRoles] Parsed ${data.length} roles for user ${userId} in org ${orgId}`);
    return data;
  });
}

export async function getUserRoles(): Promise<DataResult<UserRole[]>> {
  return safeAction(async () => {
    // Derive userId server-side from session (never trust the client)
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    if (!introspection.active) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }
    const userId = introspection.sub;
    if (!userId) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }
    assertSafeUserId(userId);

    const token = await getManagementApiToken();
    const endpoint = getCleanEndpoint();
    const url = `${endpoint}/api/users/${encodeURIComponent(userId)}/roles`;

    debugLog(`[getUserRoles] Fetching roles for user ${userId} from ${url}`);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      warn(`[getUserRoles] Management API returned ${res.status}: ${text.substring(0, 300)}`);
      throw new Error(`Management API returned ${res.status}`);
    }

    const data = (await res.json()) as UserRole[];
    debugLog(`[getUserRoles] Parsed ${data.length} roles for user ${userId}`);
    return data;
  });
}

/**
 * Gets the user's personal (global RBAC) permissions by fetching their roles
 * and the scopes assigned to each role via the Management API.
 *
 * Uses the M2M client-credentials token, so it is NOT constrained by the
 * OAuth Scope Subset Rule — new permissions granted server-side appear
 * immediately without re-authentication.
 */
export async function getUserScopes(): Promise<DataResult<PersonalPermission[]>> {
  return safeAction(async () => {
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    if (!introspection.active) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }
    const userId = introspection.sub;
    if (!userId) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }
    assertSafeUserId(userId);

    const token = await getManagementApiToken();
    const endpoint = getCleanEndpoint();

    // 1. Get user's global roles
    const rolesUrl = `${endpoint}/api/users/${encodeURIComponent(userId)}/roles`;
    debugLog(`[getUserScopes] Fetching roles for user ${userId}`);

    const rolesRes = await fetch(rolesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!rolesRes.ok) {
      const text = await rolesRes.text().catch(() => '');
      warn(`[getUserScopes] Roles fetch returned ${rolesRes.status}: ${text.substring(0, 300)}`);
      throw new Error(`Management API returned ${rolesRes.status}`);
    }

    const roles = (await rolesRes.json()) as UserRole[];
    debugLog(`[getUserScopes] Got ${roles.length} roles for user ${userId}`);

    if (roles.length === 0) return [];

    // 2. Fetch scopes for all roles, tolerating individual failures
    const scopeResults = await Promise.allSettled(
      roles.map(async (role) => {
        const scopesUrl = `${endpoint}/api/roles/${encodeURIComponent(role.id)}/scopes`;

        const scopesRes = await fetch(scopesUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!scopesRes.ok) {
          const text = await scopesRes.text().catch(() => '');
          throw new Error(`Management API returned ${scopesRes.status} for role ${role.id} scopes: ${text.substring(0, 200)}`);
        }

        try {
          return (await scopesRes.json()) as RoleScope[];
        } catch {
          const text = await scopesRes.text().catch(() => '');
          throw new Error(`Management API returned non-JSON for role ${role.id} scopes: ${text.substring(0, 200)}`);
        }
      })
    );

    // Collect successful results, warn on failures
    const successfulResults: RoleScope[][] = [];
    for (const result of scopeResults) {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        warn(`[getUserScopes] Scope fetch failed for a role: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    if (successfulResults.length === 0) {
      throw new Error('All scope fetches failed');
    }

    // 3. Aggregate and deduplicate
    const permissions: PersonalPermission[] = [];
    const seen = new Set<string>();

    for (const scopes of successfulResults) {
      for (const scope of scopes) {
        const resource = scope.resource;
        if (!resource?.indicator || !resource?.name) {
          warn(`[getUserScopes] Scope ${scope.id} missing resource info, skipping`);
          continue;
        }
        const key = `${resource.indicator}:${scope.name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        permissions.push({
          scope: scope.name,
          resourceName: resource.name,
          resourceIndicator: resource.indicator,
        });
      }
    }

    debugLog(`[getUserScopes] Parsed ${permissions.length} permissions for user ${userId}`);
    return permissions;
  });
}
