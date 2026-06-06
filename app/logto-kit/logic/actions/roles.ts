'use server';

import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { debugLog } from '../debug';
import { assertSafeUserId, assertSafeLogtoId } from '../guards';
import { safeAction, type DataResult } from './safe';
import type { UserRole, PersonalPermission, RoleScope, PersonalAccessResult } from '../types';
import { warn } from '../log';
import { getTokenForServerAction } from './tokens';
import { sanitize } from '../errors';

interface ExpectedPrincipal {
  sub: string;
  sid?: string;
}

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
 * Verifies the authenticated user's personal (global) roles and permissions
 * via the Logto Management API (M2M credentials).
 *
 * This is the personal-RBAC equivalent of verifyOrgAccess. When an action
 * config sets requiredOrgId to "self", the route calls this instead of
 * verifyOrgAccess.
 *
 * Flow:
 *   1. Introspect session → userId
 *   2. GET /api/users/{userId}/roles → personal roles
 *   3. For each role: GET /api/roles/{roleId}/scopes → scope names
 *   4. Union scope names → effective personal permissions
 */
export async function verifyPersonalAccess(
  expectedPrincipal?: ExpectedPrincipal
): Promise<DataResult<PersonalAccessResult>> {
  return safeAction(async () => {
    let userId: string;

    if (expectedPrincipal) {
      let introspection: Awaited<ReturnType<typeof introspectToken>> | undefined;

      try {
        const sessionToken = await getTokenForServerAction();
        introspection = await introspectToken(sessionToken);
      } catch {
        // Compatibility fallback mode: caller-provided principal is authoritative
        // only when session token retrieval/introspection cannot run.
        introspection = undefined;
      }

      if (!introspection) {
        userId = expectedPrincipal.sub;
      } else {
        if (!introspection.active) {
          throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
        }

        const actualUserId = introspection.sub;
        if (!actualUserId) {
          throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
        }

        if (expectedPrincipal.sub !== actualUserId) {
          throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
        }

        if (
          expectedPrincipal.sid &&
          introspection.sid &&
          expectedPrincipal.sid !== introspection.sid
        ) {
          throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
        }

        userId = actualUserId;
      }
    } else {
      // Existing strict behavior: session is required when no expected principal is supplied.
      const sessionToken = await getTokenForServerAction();
      const introspection = await introspectToken(sessionToken);
      if (!introspection.active) {
        throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
      }

      const actualUserId = introspection.sub;
      if (!actualUserId) {
        throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
      }

      userId = actualUserId;
    }

    assertSafeUserId(userId);

    const m2mToken = await getManagementApiToken();
    const endpoint = getCleanEndpoint();

    // Step 1: fetch user's personal roles
    const rolesUrl = `${endpoint}/api/users/${encodeURIComponent(userId)}/roles`;
    debugLog(`[verifyPersonalAccess] Fetching personal roles: ${rolesUrl}`);

    const rolesRes = await fetch(rolesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${m2mToken}` },
    });

    if (!rolesRes.ok) {
      const text = await rolesRes.text().catch(() => '');
      warn(`[verifyPersonalAccess] Roles endpoint returned ${rolesRes.status}: ${text.substring(0, 200)}`);
      throw new Error('UNAUTHORIZED');
    }

    const roles = (await rolesRes.json()) as UserRole[];
    debugLog(`[verifyPersonalAccess] User ${userId} has ${roles.length} personal roles`);

    if (roles.length === 0) {
      return { roles: [], permissions: [] };
    }

    // Step 2: fetch scopes for every role in parallel
    const scopeResults = await Promise.allSettled(
      roles.map(async (role) => {
        const scopesUrl = `${endpoint}/api/roles/${encodeURIComponent(role.id)}/scopes`;
        const scopesRes = await fetch(scopesUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${m2mToken}` },
        });

        if (!scopesRes.ok) {
          const text = await scopesRes.text().catch(() => '');
          warn(`[verifyPersonalAccess] Scopes endpoint returned ${scopesRes.status} for role ${role.id}: ${text.substring(0, 200)}`);
          throw new Error(`Scopes fetch failed for role ${role.id}: ${scopesRes.status}`);
        }

        return (await scopesRes.json()) as RoleScope[];
      })
    );

    // Union scope names from all successful fetches
    const seen = new Set<string>();
    const permissions: string[] = [];

    for (const result of scopeResults) {
      if (result.status === 'fulfilled') {
        for (const scope of result.value) {
          if (scope.name && !seen.has(scope.name)) {
            seen.add(scope.name);
            permissions.push(scope.name);
          }
        }
      } else {
        warn(`[verifyPersonalAccess] Scope fetch failed for a role: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    debugLog(`[verifyPersonalAccess] Effective personal permissions for user ${userId}:`, permissions);
    return { roles, permissions };
  });
}

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
          description: scope.description,
        });
      }
    }

    debugLog(`[getUserScopes] Parsed ${permissions.length} permissions for user ${userId}`);
    return permissions;
  });
}
