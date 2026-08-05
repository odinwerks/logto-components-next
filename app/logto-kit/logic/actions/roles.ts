'use server';

import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { debugLog } from '../debug';
import { assertSafeUserId, assertSafeLogtoId } from '../guards';
import { safeAction, type DataResult } from './safe';
import type { UserRole, PersonalPermission, RoleScope, PersonalAccessResult, OidcIntrospectionResponse } from '../types';
import { warn } from '../log';
import { getTokenForServerAction } from './tokens';
import { sanitize, plainCode } from '../errors';
import { fetchAllManagementPages, makeManagementFetch } from './management-request';

interface ExpectedPrincipal {
  sub: string;
  sid?: string;
}

/** Only explicit provider non-membership codes may turn a 422 into this code. */
function isConfirmedOrganizationNonMembership(status: number, body: string): boolean {
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

export async function getRoleDetails(roleId: string): Promise<DataResult<UserRole>> {
  return safeAction(async () => {
    assertSafeLogtoId(roleId, 'roleId');

    let sessionToken: string;
    try {
      sessionToken = await getTokenForServerAction();
    } catch {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    const introspection = await introspectToken(sessionToken, { assertAudience: true });
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

    // IDOR guard: verify the caller is actually assigned to the requested role
    // before fetching its details with the M2M token. Without this check any
    // authenticated user could read any role's metadata by guessing or
    // enumerating role IDs (Insecure Direct Object Reference). The caller's
    // role assignments are fetched from the user-scoped endpoint using the
    // server-derived userId (never client-supplied).
    const rolesUrl = `${endpoint}/api/users/${encodeURIComponent(userId)}/roles`;
    debugLog(`[getRoleDetails] Fetching assigned roles for user ${userId} to authorize role ${roleId}`);

    const rolesResult = await fetchAllManagementPages<UserRole>(rolesUrl, { token });

    if (!rolesResult.ok) {
      const rolesRes = rolesResult.response;
      // Fail closed: if we cannot verify the caller's role assignments we
      // must not proceed to fetch the requested role. Deny access rather
      // than risk leaking unassigned role metadata.
      warn(`[getRoleDetails] User roles endpoint returned ${rolesRes.status}`);
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    const assignedRoles = rolesResult.data;
    const isAssigned = assignedRoles.some((role) => role.id === roleId);
    if (!isAssigned) {
      warn(`[getRoleDetails] User ${userId} attempted to access unassigned role ${roleId}`);
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    const url = `${endpoint}/api/roles/${encodeURIComponent(roleId)}`;

    debugLog(`[getRoleDetails] Fetching role ${roleId} from ${url}`);

    const res = await makeManagementFetch(url, { method: 'GET', token });

    if (!res.ok) {
      warn(`[getRoleDetails] Management API returned ${res.status}`);
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
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
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

    const rolesResult = await fetchAllManagementPages<UserRole>(url, { token });

    if (!rolesResult.ok) {
      const res = rolesResult.response;
      warn(`[getOrganizationUserRoles] Management API returned ${res.status}`);
      if (res.status === 403 || res.status === 404) {
        throw plainCode('ORG_NOT_MEMBER');
      }
      const text = await res.text().catch(() => '');
      if (isConfirmedOrganizationNonMembership(res.status, text)) {
        throw plainCode('ORG_NOT_MEMBER');
      }
      throw new Error(`Management API returned ${res.status}`);
    }

    const data = rolesResult.data;
    debugLog(`[getOrganizationUserRoles] Parsed ${data.length} roles for user ${userId} in org ${orgId}`);
    return data;
  });
}

export async function getUserRoles(): Promise<DataResult<UserRole[]>> {
  return safeAction(async () => {
    // Derive userId server-side from session (never trust the client)
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
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

    const rolesResult = await fetchAllManagementPages<UserRole>(url, { token });

    if (!rolesResult.ok) {
      const res = rolesResult.response;
      warn(`[getUserRoles] Management API returned ${res.status}`);
      throw new Error(`Management API returned ${res.status}`);
    }

    const data = rolesResult.data;
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
 * SECURITY CONTRACT (BUG-005): The authoritative user identity ALWAYS comes
 * from a fresh `introspectToken(...)` call performed inside this function,
 * derived from the live session token. The `expectedPrincipal` parameter is
 * treated ONLY as a consistency assertion compared against the introspected
 * `sub`/`sid` — it is never trusted as the identity itself. There is no
 * `existingIntrospection` parameter: trusting a caller-supplied introspection
 * object's `.sub` would be a latent IDOR (a caller could substitute another
 * user's `sub` and gain access to their roles/permissions).
 *
 * BUG-061: The `introspectToken(...)` call is wrapped in try/catch so a
 * network/token failure fails closed as UNAUTHORIZED instead of bubbling raw
 * upstream errors.
 *
 * Flow:
 *   1. Introspect session → userId
 *   2. GET /api/users/{userId}/roles → personal roles
 *   3. For each role: GET /api/roles/{roleId}/scopes → scope names
 *   4. Union scope names → effective personal permissions
 */
export async function verifyPersonalAccess(
  expectedPrincipal?: ExpectedPrincipal,
): Promise<DataResult<PersonalAccessResult>> {
  return safeAction(async () => {
    // BUG-005: ALWAYS perform a fresh introspection internally. The user
    // identity must come from the live session token, never from a
    // caller-supplied introspection object (latent IDOR).
    // BUG-061: wrap token retrieval + introspection in try/catch so failures
    // fail closed as UNAUTHORIZED instead of bubbling raw errors.
    let introspection: OidcIntrospectionResponse;
    try {
      const sessionToken = await getTokenForServerAction();
      introspection = await introspectToken(sessionToken, { assertAudience: true });
    } catch (err) {
      throw sanitize(err, { fallback: 'UNAUTHORIZED' });
    }

    if (!introspection.active) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    const userId = introspection.sub;
    if (!userId) {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
    }

    if (expectedPrincipal) {
      if (expectedPrincipal.sub !== userId) {
        throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
      }

      if (
        expectedPrincipal.sid &&
        introspection.sid &&
        expectedPrincipal.sid !== introspection.sid
      ) {
        throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
      }
    }

    assertSafeUserId(userId);

    const m2mToken = await getManagementApiToken();
    const endpoint = getCleanEndpoint();

    // Step 1: fetch user's personal roles
    const rolesUrl = `${endpoint}/api/users/${encodeURIComponent(userId)}/roles`;
    debugLog(`[verifyPersonalAccess] Fetching personal roles: ${rolesUrl}`);

    const rolesResult = await fetchAllManagementPages<UserRole>(rolesUrl, { token: m2mToken });

    if (!rolesResult.ok) {
      const rolesRes = rolesResult.response;
      warn(`[verifyPersonalAccess] Roles endpoint returned ${rolesRes.status}`);
      throw plainCode('UNAUTHORIZED');
    }

    const roles = rolesResult.data;
    debugLog(`[verifyPersonalAccess] User ${userId} has ${roles.length} personal roles`);

    if (roles.length === 0) {
      return { roles: [], permissions: [] };
    }

    // Step 2: fetch scopes for every role in parallel
    const scopeResults = await Promise.allSettled(
      roles.map(async (role) => {
        const scopesUrl = `${endpoint}/api/roles/${encodeURIComponent(role.id)}/scopes`;
        const scopesResult = await fetchAllManagementPages<RoleScope>(scopesUrl, { token: m2mToken });

        if (!scopesResult.ok) {
          const scopesRes = scopesResult.response;
          warn(`[verifyPersonalAccess] Scopes endpoint returned ${scopesRes.status}`);
          throw new Error(`Scopes fetch failed: ${scopesRes.status}`);
        }

        return scopesResult.data;
      })
    );

    // Union scope names from all successful fetches
    const seen = new Set<string>();
    const permissions: string[] = [];
    let successfulFetches = 0;

    for (const result of scopeResults) {
      if (result.status === 'fulfilled') {
        successfulFetches++;
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

    if (roles.length > 0 && successfulFetches === 0) {
      throw plainCode('FETCH_FAILED');
    }

    debugLog(`[verifyPersonalAccess] Effective personal permissions for user ${userId}:`, permissions);
    return { roles, permissions };
  });
}

export async function getUserScopes(): Promise<DataResult<PersonalPermission[]>> {
  return safeAction(async () => {
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
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

    const rolesResult = await fetchAllManagementPages<UserRole>(rolesUrl, { token });

    if (!rolesResult.ok) {
      const rolesRes = rolesResult.response;
      warn(`[getUserScopes] Roles fetch returned ${rolesRes.status}`);
      throw new Error(`Management API returned ${rolesRes.status}`);
    }

    const roles = rolesResult.data;
    debugLog(`[getUserScopes] Got ${roles.length} roles for user ${userId}`);

    if (roles.length === 0) return [];

    // 2. Fetch scopes for all roles, tolerating individual failures
    const scopeResults = await Promise.allSettled(
      roles.map(async (role) => {
        const scopesUrl = `${endpoint}/api/roles/${encodeURIComponent(role.id)}/scopes`;

        const scopesResult = await fetchAllManagementPages<RoleScope>(scopesUrl, { token });

        if (!scopesResult.ok) {
          const scopesRes = scopesResult.response;
          warn(`[getUserScopes] Management API scopes request returned ${scopesRes.status}`);
          throw new Error(`Management API returned ${scopesRes.status}`);
        }

        return scopesResult.data;
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
      throw plainCode('FETCH_FAILED');
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
