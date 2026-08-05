'use server';

import LogtoClient from '@logto/next/server-actions';
import { getLogtoConfig, getManagementApiToken } from '../../config';
import { debugLog } from '../debug';
import { assertSafeLogtoId, decodeLogtoAccessToken, assertSafeUserId } from '../guards';
import { safeAction, type DataResult } from './safe';
import { warn } from '../log';
import { sanitize, plainCode } from '../errors';
import crypto from 'node:crypto';
import { introspectToken } from '../utils';
import { getTokenForServerAction } from './tokens';
import type { UserRole, OrgRoleScope, OidcIntrospectionResponse } from '../types';
import { fetchAllManagementPages } from './management-request';

interface OrganizationNodeClient {
  getRefreshToken: () => Promise<string | null>;
  adapter: {
    setStorageItem: (key: string, value: string) => Promise<void>;
  };
}

interface RefreshCoordinator {
  /** Latest token produced by any refresh-capable step in this process. */
  currentRefreshToken: string;
  /** One authentication/introspection sequence shared by this request wave. */
  authentication: Promise<boolean> | null;
  /** Session-wide grant fence: different organizations must not refresh in parallel. */
  tail: Promise<void>;
  /** Same-organization callers may safely share the complete result. */
  inFlightByOrg: Map<string, Promise<DataResult<string[]>>>;
  /** Digests for the original and any rotated refresh tokens. */
  aliases: Set<string>;
}

/**
 * Process-local refresh-token coordinators.
 *
 * The key is a SHA-256 digest of the session's refresh token, which lets us
 * install the fence before getTokenForServerAction() performs any
 * refresh-capable SDK work. Organization IDs deliberately are not part of the
 * coordinator identity: Logto's rotating refresh token belongs to the whole
 * session, so different-org grants must be serialized while their results stay
 * isolated in inFlightByOrg.
 *
 * Rotated-token aliases keep already-concurrent requests on the same fence and
 * currentRefreshToken propagates the winning token instead of rereading a stale
 * request cookie. This is intentionally single-process coordination; a shared
 * lease/fencing-token design is still required for multi-instance deployments.
 */
const refreshCoordinators = new Map<string, RefreshCoordinator>();

function refreshIdentity(refreshToken: string): string {
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
}

function addRefreshAlias(coordinator: RefreshCoordinator, refreshToken: string): void {
  const alias = refreshIdentity(refreshToken);
  coordinator.aliases.add(alias);
  refreshCoordinators.set(alias, coordinator);
}

function removeRefreshCoordinator(coordinator: RefreshCoordinator): void {
  for (const alias of coordinator.aliases) {
    if (refreshCoordinators.get(alias) === coordinator) {
      refreshCoordinators.delete(alias);
    }
  }
}

async function authenticateRefreshCoordinator(
  coordinator: RefreshCoordinator,
  nodeClient: OrganizationNodeClient,
): Promise<boolean> {
  try {
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub || !introspection.sid) return false;

    // The SDK call above may itself rotate the refresh token. Read the updated
    // request-scoped storage while holding the session fence and publish it to
    // queued callers before any direct organization grant starts.
    const latestRefreshToken = await nodeClient.getRefreshToken();
    if (latestRefreshToken && latestRefreshToken !== coordinator.currentRefreshToken) {
      coordinator.currentRefreshToken = latestRefreshToken;
      addRefreshAlias(coordinator, latestRefreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

function enqueueRefreshGrant<T>(
  coordinator: RefreshCoordinator,
  operation: () => Promise<T>,
): Promise<T> {
  const run = coordinator.tail.then(operation, operation);
  coordinator.tail = run.then(() => undefined, () => undefined);
  return run;
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

/**
 * Gets organization-scoped permissions for the current user.
 * 
 * Note: The org token is obtained directly from Logto's HTTPS token endpoint
 * in this same request - it was not cached or passed through an intermediary,
 * so signature verification is skipped per guards.ts policy. The token is
 * consumed server-side only and never exposed to the client.
 *
 * Makes a direct HTTP call to Logto's /oidc/token endpoint (refresh_token grant
 * with organization_id) instead of going through the SDK's getOrganizationToken,
 * which caches access tokens in a cookie-persisted `accessTokenMap` that
 * survives page refreshes.
 *
 * Used only by the loadOrganizationPermissions server action which feeds
 * the Protected UI component (client-side display gate only - not the
 * security boundary). The security boundary uses verifyOrgAccess() below.
 *
 * Concurrent callers for the same orgId share the in-flight promise
 * (BUG-020 dedup) to prevent racing on Logto's one-time-use refresh token
 * rotation.
 */
export async function getOrganizationUserPermissions(orgId: string): Promise<DataResult<string[]>> {
  // Reading the refresh token is storage-only. Do it before any call to
  // getTokenForServerAction(), then atomically install/find the session fence.
  const prepared = await safeAction(async () => {
    assertSafeLogtoId(orgId, 'orgId');
    const config = getLogtoConfig();
    const logtoClient = new LogtoClient(config);
    const nodeClient = await logtoClient.createNodeClient() as OrganizationNodeClient;
    const refreshToken = await nodeClient.getRefreshToken();
    if (!refreshToken) {
      warn('[getOrganizationUserPermissions] No refresh token in session');
      throw plainCode('UNAUTHORIZED');
    }
    return { config, nodeClient, refreshToken };
  });
  if (!prepared.ok) return prepared;

  const { config, nodeClient, refreshToken } = prepared.data;
  const identity = refreshIdentity(refreshToken);
  let coordinator = refreshCoordinators.get(identity);
  if (!coordinator) {
    coordinator = {
      currentRefreshToken: refreshToken,
      authentication: null,
      tail: Promise.resolve(),
      inFlightByOrg: new Map(),
      aliases: new Set([identity]),
    };
    // M-017: publish the coordinator before starting refresh-capable SDK work.
    refreshCoordinators.set(identity, coordinator);
    coordinator.authentication = authenticateRefreshCoordinator(coordinator, nodeClient);
  }

  const existing = coordinator.inFlightByOrg.get(orgId);
  if (existing) return existing;

  const activeCoordinator = coordinator;
  const promise = enqueueRefreshGrant(activeCoordinator, () => safeAction(async () => {
    if (!await activeCoordinator.authentication) {
      throw plainCode('UNAUTHORIZED');
    }

    // Direct call to Logto's token endpoint bypasses the SDK's
    // cookie-persisted accessTokenMap cache entirely. Every call gets a
    // fresh token with the user's current organization permissions.
    const endpoint = config.endpoint.replace(/\/$/, '');
    const parsed = new URL(endpoint);
    // Exempt IPv4 loopback, IPv6 loopback, and localhost from the HTTPS
    // requirement so local development and Docker setups work (CFG-BUG-004).
    const isLocalhost =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '[::1]' ||
      parsed.hostname === '0:0:0:0:0:0:0:1' ||
      parsed.hostname === '[0:0:0:0:0:0:0:1]';
    if (parsed.protocol !== 'https:' && !isLocalhost) {
      throw new Error('Logto endpoint must use HTTPS in production');
    }
    const tokenEndpoint = `${endpoint}/oidc/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.appId,
      // Never reread the request cookie here: a prior queued grant may have
      // rotated it after this request began.
      refresh_token: activeCoordinator.currentRefreshToken,
      organization_id: orgId,
    });

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.appId}:${config.appSecret}`).toString('base64')}`,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      warn(`[getOrganizationUserPermissions] Token endpoint returned ${res.status}: ${errText.substring(0, 200)}`);
      if (isConfirmedOrganizationNonMembership(res.status, errText)) {
        throw plainCode('ORG_NOT_MEMBER');
      }
      throw plainCode('UNAUTHORIZED');
    }

    const data = await res.json();
    const orgToken = data.access_token as string | undefined;
    if (!orgToken) {
      warn('[getOrganizationUserPermissions] No access_token in response');
      throw plainCode('UNAUTHORIZED');
    }

    // BUG-L01: Persist a rotated refresh token back into the SDK's cookie-backed
    // session storage so the SDK's getAccessToken doesn't hit invalid_grant on
    // the now-revoked old token on the next call.
    //
    // The SDK stores ALL session keys (refreshToken, idToken, accessToken,
    // signInSession) inside a SINGLE encrypted cookie named `logto:{appId}`
    // (CookieStorage) — NOT in per-key cookies. The SDK's `setRefreshToken` is
    // private, but `adapter.setStorageItem` is the public method it delegates
    // to: it calls `storage.setItem('refreshToken', value)`, which re-encrypts
    // the session blob and writes the cookie. Persisting here happens BEFORE
    // decodeLogtoAccessToken so a decode failure cannot cause us to discard a
    // rotated token.
    //
    // This preserves the by-design refresh_token grant pattern (NEVER-TOUCH):
    // we only persist the token the grant produced; we do NOT replace the grant
    // with the SDK's getOrganizationToken (which would reintroduce the
    // cookie-persisted accessTokenMap cache this function intentionally avoids).
    if (data.refresh_token) {
      activeCoordinator.currentRefreshToken = data.refresh_token;
      addRefreshAlias(activeCoordinator, data.refresh_token);
      try {
        await nodeClient.adapter.setStorageItem('refreshToken', data.refresh_token);
      } catch {
        // Best-effort: if persisting fails, the next getAccessToken triggers
        // invalid_grant recovery (proxy.ts handles this gracefully).
      }
    }

    const claims = decodeLogtoAccessToken(orgToken);
    debugLog(`[getOrganizationUserPermissions] Org token scope for ${orgId}:`, claims.scope);

    const permissions = ((claims.scope as string | undefined) ?? '')
      .split(' ')
      .filter(Boolean)
      .filter((s: string) => !s.startsWith('openid'));

    debugLog(`[getOrganizationUserPermissions] Parsed permissions for ${orgId}:`, permissions);
    return permissions;
  }));

  activeCoordinator.inFlightByOrg.set(orgId, promise);
  void promise.finally(() => {
    if (activeCoordinator.inFlightByOrg.get(orgId) === promise) {
      activeCoordinator.inFlightByOrg.delete(orgId);
    }
    if (activeCoordinator.inFlightByOrg.size === 0) {
      removeRefreshCoordinator(activeCoordinator);
    }
  });

  return promise;
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
 * SECURITY CONTRACT (BUG-005): The authoritative user identity ALWAYS comes
 * from a fresh `introspectToken(...)` call performed inside this function,
 * derived from the live session token. The `expectedPrincipal` parameter is
 * treated ONLY as a consistency assertion compared against the introspected
 * `sub`/`sid` — it is never trusted as the identity itself. There is no
 * `existingIntrospection` parameter: trusting a caller-supplied introspection
 * object's `.sub` would be a latent IDOR (a caller could substitute another
 * user's `sub` and gain access to their organizations/roles).
 *
 * Any token retrieval or introspection failure fails closed as UNAUTHORIZED
 * (BUG-061): the `introspectToken(...)` call is wrapped in try/catch so raw
 * upstream errors never bubble up unsanitized.
 *
 * Empty roles (member with no roles assigned) → { roles: [], permissions: [] }
 * which downstream permission checks will reject as PERMISSION_DENIED.
 */
export async function verifyOrgAccess(
  orgId: string,
  expectedPrincipal?: ExpectedPrincipal,
): Promise<DataResult<OrgAccessResult>> {
  return safeAction(async () => {
    assertSafeLogtoId(orgId, 'orgId');

    // BUG-005: ALWAYS perform a fresh introspection internally. The user
    // identity must come from the live session token, never from a
    // caller-supplied introspection object (latent IDOR).
    // BUG-061: wrap token retrieval + introspection in try/catch so failures
    // fail closed as UNAUTHORIZED instead of bubbling raw errors.
    let introspection: OidcIntrospectionResponse;
    try {
      const sessionToken = await getTokenForServerAction();
      introspection = await introspectToken(sessionToken, { assertAudience: true });
    } catch {
      throw sanitize(new Error('UNAUTHORIZED'), { fallback: 'UNAUTHORIZED' });
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
    const endpoint = getLogtoConfig().endpoint.replace(/\/$/, '');

    // Step 1: fetch user's org roles - also acts as membership verification
    const rolesUrl = `${endpoint}/api/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/roles`;
    debugLog(`[verifyOrgAccess] Fetching org roles: ${rolesUrl}`);

    const rolesResult = await fetchAllManagementPages<UserRole>(rolesUrl, { token: m2mToken });

    if (!rolesResult.ok) {
      const rolesRes = rolesResult.response;
      const text = await rolesRes.text().catch(() => '');
      warn(`[verifyOrgAccess] Roles endpoint returned ${rolesRes.status}: ${text.substring(0, 200)}`);
       if ((rolesRes.status === 403 || rolesRes.status === 404) || isConfirmedOrganizationNonMembership(rolesRes.status, text)) {
         throw plainCode('ORG_NOT_MEMBER');
       }
      throw new Error(`Management API error: HTTP ${rolesRes.status}`);
    }

    const roles = rolesResult.data;
    debugLog(`[verifyOrgAccess] User ${userId} has ${roles.length} roles in org ${orgId}`);

    if (roles.length === 0) {
      // Member with zero roles - no permissions possible
      return { roles: [], permissions: [] };
    }

    // Step 2: fetch scopes for every role in parallel, tolerating individual failures
    const scopeResults = await Promise.allSettled(
      roles.map(async (role) => {
        const scopesUrl = `${endpoint}/api/organization-roles/${encodeURIComponent(role.id)}/scopes`;
        const scopesResult = await fetchAllManagementPages<OrgRoleScope>(scopesUrl, { token: m2mToken });

        if (!scopesResult.ok) {
          const scopesRes = scopesResult.response;
          const text = await scopesRes.text().catch(() => '');
          warn(`[verifyOrgAccess] Scopes endpoint returned ${scopesRes.status} for role ${role.id}: ${text.substring(0, 200)}`);
          throw new Error(`Scopes fetch failed for role ${role.id}: ${scopesRes.status}`);
        }

        return scopesResult.data;
      })
    );

    // Union scope names from all successful role-scope fetches
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
        warn(`[verifyOrgAccess] Scope fetch failed for a role: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    if (roles.length > 0 && successfulFetches === 0) {
      throw plainCode('FETCH_FAILED');
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
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
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

    const rolesResult = await fetchAllManagementPages<UserRole>(rolesUrl, { token: m2mToken });

    if (!rolesResult.ok) {
      const rolesRes = rolesResult.response;
      const text = await rolesRes.text().catch(() => '');
      warn(`[getOrgPermissionsWithDescriptions] Roles endpoint returned ${rolesRes.status}: ${text.substring(0, 200)}`);
      if (rolesRes.status === 403 || rolesRes.status === 404) return [];
      if (isConfirmedOrganizationNonMembership(rolesRes.status, text)) {
        throw plainCode('ORG_NOT_MEMBER');
      }
      throw new Error(`Management API error: HTTP ${rolesRes.status}`);
    }

    const roles = rolesResult.data;
    debugLog(`[getOrgPermissionsWithDescriptions] User has ${roles.length} roles in org ${orgId}`);

    if (roles.length === 0) return [];

    // Step 2: fetch scopes with descriptions for every role in parallel
    const scopeResults = await Promise.allSettled(
      roles.map(async (role) => {
        const scopesUrl = `${endpoint}/api/organization-roles/${encodeURIComponent(role.id)}/scopes`;
        const scopesResult = await fetchAllManagementPages<OrgRoleScope>(scopesUrl, { token: m2mToken });

        if (!scopesResult.ok) {
          const scopesRes = scopesResult.response;
          const text = await scopesRes.text().catch(() => '');
          warn(`[getOrgPermissionsWithDescriptions] Scopes endpoint returned ${scopesRes.status} for role ${role.id}: ${text.substring(0, 200)}`);
          throw new Error(`Scopes fetch failed for role ${role.id}: ${scopesRes.status}`);
        }

        return scopesResult.data;
      })
    );

    // Aggregate all scopes, deduplicate by name
    const seen = new Set<string>();
    const allScopes: OrgRoleScope[] = [];
    let successfulFetches = 0;

    for (const result of scopeResults) {
      if (result.status === 'fulfilled') {
        successfulFetches++;
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

    // BUG-L10: Guard against total scope-fetch failure. Without this, a full
    // M2M outage on the scopes endpoint is indistinguishable from "user has
    // zero permissions" and silently returns []. Mirrors the sibling guards in
    // verifyOrgAccess (roles.length > 0 && successfulFetches === 0) and
    // getUserScopes (successfulResults.length === 0). roles.length === 0
    // returns early above, so reaching here guarantees roles.length > 0.
    if (successfulFetches === 0) {
      throw plainCode('FETCH_FAILED');
    }

    debugLog(`[getOrgPermissionsWithDescriptions] Found ${allScopes.length} unique permissions for org ${orgId}`);
    return allScopes;
  });
}
