'use server';

import LogtoClient from '@logto/next/server-actions';
import { getLogtoConfig, getManagementApiToken } from '../../config';
import { debugLog } from '../debug';
import { assertSafeLogtoId, decodeLogtoAccessToken, assertSafeUserId } from '../guards';
import { safeAction, type DataResult } from './safe';
import { warn } from '../log';
import { sanitize } from '../errors';
import { introspectToken } from '../utils';
import { getTokenForServerAction } from './tokens';
import type { UserRole, OrgRoleScope } from '../types';

/**
 * Gets the user's permissions for a specific organization.
 *
 * Makes a direct HTTP call to Logto's /oidc/token endpoint (refresh_token grant
 * with organization_id) instead of going through the SDK's getOrganizationToken,
 * which caches access tokens in a cookie-persisted `accessTokenMap` that
 * survives page refreshes.
 *
 * Used only by the loadOrganizationPermissions server action which feeds
 * the Protected UI component (client-side display gate only - not the
 * security boundary). The security boundary uses verifyOrgAccess() below.
 */
export async function getOrganizationUserPermissions(orgId: string): Promise<DataResult<string[]>> {
  return safeAction(async () => {
    assertSafeLogtoId(orgId, 'orgId');

    const config = getLogtoConfig();
    const logtoClient = new LogtoClient(config);
    const nodeClient = await logtoClient.createNodeClient();

    // Read the refresh token from the session (read-only, no cookie write)
    const refreshToken = await nodeClient.getRefreshToken();
    if (!refreshToken) {
      warn('[getOrganizationUserPermissions] No refresh token in session');
      throw new Error('UNAUTHORIZED');
    }

    // Direct call to Logto's token endpoint bypasses the SDK's
    // cookie-persisted accessTokenMap cache entirely. Every call gets a
    // fresh token with the user's current organization permissions.
    const endpoint = config.endpoint.replace(/\/$/, '');
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      throw new Error('Logto endpoint must use HTTPS in production');
    }
    const tokenEndpoint = `${endpoint}/oidc/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.appId,
      refresh_token: refreshToken,
      organization_id: orgId,
    });

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.appId}:${config.appSecret}`).toString('base64')}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      warn(`[getOrganizationUserPermissions] Token endpoint returned ${res.status}: ${errText.substring(0, 200)}`);
      throw new Error('UNAUTHORIZED');
    }

    const data = await res.json();
    const orgToken = data.access_token as string | undefined;
    if (!orgToken) {
      warn('[getOrganizationUserPermissions] No access_token in response');
      throw new Error('UNAUTHORIZED');
    }

    const claims = decodeLogtoAccessToken(orgToken);
    debugLog(`[getOrganizationUserPermissions] Org token scope for ${orgId}:`, claims.scope);

    const permissions = ((claims.scope as string | undefined) ?? '')
      .split(' ')
      .filter(Boolean)
      .filter((s: string) => !s.startsWith('openid'));

    debugLog(`[getOrganizationUserPermissions] Parsed permissions for ${orgId}:`, permissions);
    return permissions;
  });
}

// ============================================================================
// M2M org verification - used by the Protected Actions API security boundary
// ============================================================================

export interface OrgAccessResult {
  roles: UserRole[];
  permissions: string[];
}

interface ExpectedPrincipal {
  sub: string;
  sid?: string;
}

/**
 * Verifies the authenticated user's access to an organization via the
 * Logto Management API (M2M credentials - never the user's own session token).
 *
 * Performs the full verification chain in a single function:
 *   1. GET /api/organizations/{orgId}/users/{userId}/roles
 * - confirms org membership (non-200 → ORG_NOT_MEMBER)
 * - returns user's org roles
 *   2. For each role: GET /api/organization-roles/{roleId}/scopes
 * - derives the user's effective permission set for this org
 *
 * Returns { roles, permissions } for the route to check against
 * ActionConfig.requiredRole and ActionConfig.requiredPerm.
 *
 * If expectedPrincipal is provided, it is treated only as a consistency
 * assertion against introspection claims. The authoritative user identity must
 * come from successful token introspection. Any token retrieval or
 * introspection failure fails closed as UNAUTHORIZED.
 *
 * Empty roles (member with no roles assigned) → { roles: [], permissions: [] }
 * which downstream permission checks will reject as PERMISSION_DENIED.
 */
export async function verifyOrgAccess(
  orgId: string,
  expectedPrincipal?: ExpectedPrincipal
): Promise<DataResult<OrgAccessResult>> {
  return safeAction(async () => {
    assertSafeLogtoId(orgId, 'orgId');

    let userId: string;

    if (expectedPrincipal) {
      let introspection: Awaited<ReturnType<typeof introspectToken>>;

      try {
        const sessionToken = await getTokenForServerAction();
        introspection = await introspectToken(sessionToken);
      } catch {
        // Fail closed: expectedPrincipal is never authoritative identity.
        throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
      }

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
    const endpoint = getLogtoConfig().endpoint.replace(/\/$/, '');

    // Step 1: fetch user's org roles - also acts as membership verification
    const rolesUrl = `${endpoint}/api/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/roles`;
    debugLog(`[verifyOrgAccess] Fetching org roles: ${rolesUrl}`);

    const rolesRes = await fetch(rolesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${m2mToken}` },
    });

    if (!rolesRes.ok) {
      const text = await rolesRes.text().catch(() => '');
      warn(`[verifyOrgAccess] Roles endpoint returned ${rolesRes.status}: ${text.substring(0, 200)}`);
      // Non-200 from the org-user-roles endpoint means the user is not a
      // member of this org (or the org doesn't exist).
      throw new Error('ORG_NOT_MEMBER');
    }

    const roles = (await rolesRes.json()) as UserRole[];
    debugLog(`[verifyOrgAccess] User ${userId} has ${roles.length} roles in org ${orgId}`);

    if (roles.length === 0) {
      // Member with zero roles - no permissions possible
      return { roles: [], permissions: [] };
    }

    // Step 2: fetch scopes for every role in parallel, tolerating individual failures
    const scopeResults = await Promise.allSettled(
      roles.map(async (role) => {
        const scopesUrl = `${endpoint}/api/organization-roles/${encodeURIComponent(role.id)}/scopes`;
        const scopesRes = await fetch(scopesUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${m2mToken}` },
        });

        if (!scopesRes.ok) {
          const text = await scopesRes.text().catch(() => '');
          warn(`[verifyOrgAccess] Scopes endpoint returned ${scopesRes.status} for role ${role.id}: ${text.substring(0, 200)}`);
          throw new Error(`Scopes fetch failed for role ${role.id}: ${scopesRes.status}`);
        }

        return (await scopesRes.json()) as OrgRoleScope[];
      })
    );

    // Union scope names from all successful role-scope fetches
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
        warn(`[verifyOrgAccess] Scope fetch failed for a role: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    debugLog(`[verifyOrgAccess] Effective permissions for user ${userId} in org ${orgId}:`, permissions);
    return { roles, permissions };
  });
}

/**
 * Fetches enriched organization permission data WITH descriptions via the
 * M2M Management API chain.
 *
 * Uses the same flow as verifyOrgAccess() but returns the full OrgRoleScope[]
 * so descriptions are available for UI display. The OIDC token path
 * (getOrganizationUserPermissions) only returns bare scope names.
 *
 * Used by the PermissionsBlock UI component for displaying permission info hovers.
 */
export async function getOrgPermissionsWithDescriptions(orgId: string): Promise<DataResult<OrgRoleScope[]>> {
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

    const m2mToken = await getManagementApiToken();
    const endpoint = getLogtoConfig().endpoint.replace(/\/$/, '');

    // Step 1: fetch user's org roles
    const rolesUrl = `${endpoint}/api/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/roles`;
    debugLog(`[getOrgPermissionsWithDescriptions] Fetching org roles: ${rolesUrl}`);

    const rolesRes = await fetch(rolesUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${m2mToken}` },
    });

    if (!rolesRes.ok) {
      const text = await rolesRes.text().catch(() => '');
      warn(`[getOrgPermissionsWithDescriptions] Roles endpoint returned ${rolesRes.status}: ${text.substring(0, 200)}`);
      return [];
    }

    const roles = (await rolesRes.json()) as UserRole[];
    debugLog(`[getOrgPermissionsWithDescriptions] User has ${roles.length} roles in org ${orgId}`);

    if (roles.length === 0) return [];

    // Step 2: fetch scopes with descriptions for every role in parallel
    const scopeResults = await Promise.allSettled(
      roles.map(async (role) => {
        const scopesUrl = `${endpoint}/api/organization-roles/${encodeURIComponent(role.id)}/scopes`;
        const scopesRes = await fetch(scopesUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${m2mToken}` },
        });

        if (!scopesRes.ok) {
          const text = await scopesRes.text().catch(() => '');
          warn(`[getOrgPermissionsWithDescriptions] Scopes endpoint returned ${scopesRes.status} for role ${role.id}: ${text.substring(0, 200)}`);
          throw new Error(`Scopes fetch failed for role ${role.id}: ${scopesRes.status}`);
        }

        return (await scopesRes.json()) as OrgRoleScope[];
      })
    );

    // Aggregate all scopes, deduplicate by name
    const seen = new Set<string>();
    const allScopes: OrgRoleScope[] = [];

    for (const result of scopeResults) {
      if (result.status === 'fulfilled') {
        for (const scope of result.value) {
          if (scope.name && !seen.has(scope.name)) {
            seen.add(scope.name);
            allScopes.push(scope);
          }
        }
      } else {
        warn(`[getOrgPermissionsWithDescriptions] Scope fetch failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    debugLog(`[getOrgPermissionsWithDescriptions] Found ${allScopes.length} unique permissions for org ${orgId}`);
    return allScopes;
  });
}
