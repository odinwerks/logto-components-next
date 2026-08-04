import 'server-only';

/**
 * ============================================================================
 * Instant Fetch RBAC Cores (server-only, React.cache-safe)
 * ============================================================================
 *
 * Combined personal and org RBAC fetchers that merge the duplicate
 * roles-then-scopes chains previously spread across:
 *   - `getUserRoles` + `getUserScopes` (personal)
 *   - `getOrganizationUserRoles` + `getOrgPermissionsWithDescriptions` (org)
 *
 * Each core is a plain `async` function (NOT a `'use server'` export). This
 * mirrors the `fetchDashboardDataCore` contract (`dashboard-data.ts:88-99`)
 * and is what makes them safe to wrap with `React.cache()` for per-request
 * deduplication across the desktop+mobile double-RSC render.
 *
 * NEVER-TOUCH compliance:
 *   - `getManagementApiToken()` is called with NO args. Its internal config
 *     (`scope: 'all'`, `resource` fallback chain) is untouched.
 *   - `userId` is server-derived (from `fetchDashboardDataCore`'s
 *     `claims.sub`); it is validated with `assertSafeLogtoId(userId, 'userId')`
 *     before any URL interpolation. No client-supplied `userId` is accepted.
 *   - All IDs are `encodeURIComponent`-wrapped before interpolation.
 *   - Only plain serializable arrays (`UserRole[]`, `PersonalPermission[]`,
 *     `OrgRoleScope[]`) are returned. No tokens (access, refresh, M2M, ID)
 *     ever leave this module. No `Map`, no class instances, no `bigint`.
 *
 * BUG-L01 compliance:
 *   - `fetchOrgRbacCore` does NOT call `getOrganizationUserPermissions` (the
 *     refresh-token grant). That grant stays lazy and runs only on explicit
 *     `useOrgPermissions.refresh()` — a security improvement (fewer token
 *     rotations).
 *
 * Error handling:
 *   - On `roles GET` failure: throw `plainCode('FETCH_FAILED')` so the
 *     streamed promise rejects into `<TabErrorBoundary>`.
 *   - On partial scope-fetch failure: tolerate via `Promise.allSettled` and
 *     return the union of successful fetches (mirrors existing
 *     `getUserScopes:355-357` and `getOrgPermissionsWithDescriptions:370-387`).
 *   - On total scope-fetch failure (all roles' scopes failed): throw
 *     `plainCode('FETCH_FAILED')` (BUG-L10 guard).
 */

import { getManagementApiToken } from '../config';
import { getCleanEndpoint } from './utils';
import { assertSafeLogtoId } from './guards';
import { warn } from './log';
import { plainCode } from './errors';
import { fetchAllManagementPages } from './actions/management-request';
import type {
  UserRole,
  RoleScope,
  PersonalPermission,
  OrgRoleScope,
  PersonalRbacResult,
  OrgRbacResult,
} from './types';

// ============================================================================
// fetchPersonalRbacCore
// ============================================================================

/**
 * Combined personal RBAC fetch. Plain server-only async fn (NOT a Server
 * Action), safe to wrap with `React.cache()`. Accepts a SERVER-DERIVED
 * `userId` (from `fetchDashboardDataCore`'s `claims.sub`) — never client
 * input. Throws on auth/fetch failure so the streamed promise rejects into
 * `<TabErrorBoundary>`.
 *
 * One complete paginated M2M roles list + N parallel complete paginated scope
 * lists. No introspection (userId passed in).
 *
 * Merges the work of `getUserRoles` + `getUserScopes`, eliminating the
 * duplicate roles GET and the duplicate introspection.
 */
export async function fetchPersonalRbacCore(userId: string): Promise<PersonalRbacResult> {
  assertSafeLogtoId(userId, 'userId');

  const token = await getManagementApiToken();
  const endpoint = getCleanEndpoint();

  // Step 1: fetch all pages of the user's personal roles.
  const rolesUrl = `${endpoint}/api/users/${encodeURIComponent(userId)}/roles`;
  const rolesResult = await fetchAllManagementPages<UserRole>(rolesUrl, { token });

  if (!rolesResult.ok) {
    const rolesRes = rolesResult.response;
    const text = await rolesRes.text().catch(() => '');
    warn(
      `[fetchPersonalRbacCore] Roles endpoint returned ${rolesRes.status} for user ${userId}: ${text.substring(0, 200)}`,
    );
    throw plainCode('FETCH_FAILED');
  }

  const rawRoles = rolesResult.data;

  if (rawRoles.length === 0) {
    return { roles: [], permissions: [] };
  }

  // Strip tenantId before returning to client (BUG-048).
  const roles: UserRole[] = rawRoles.map(({ tenantId: _t, ...rest }) => rest);

  // Step 2: fetch scopes for all roles in parallel, tolerating individual failures.
  const scopeResults = await Promise.allSettled(
    roles.map(async (role) => {
      const scopesUrl = `${endpoint}/api/roles/${encodeURIComponent(role.id)}/scopes`;
      const scopesResult = await fetchAllManagementPages<RoleScope>(scopesUrl, { token });

      if (!scopesResult.ok) {
        const scopesRes = scopesResult.response;
        // BUG-L12: 404 means the role has no scopes. Treat as
        // empty success rather than a hard fetch failure, so that
        // one role without scopes does not sink the entire batch.
        if (scopesRes.status === 404) return [];
        const text = await scopesRes.text().catch(() => '');
        warn(
          `[fetchPersonalRbacCore] Scopes endpoint returned ${scopesRes.status} for role ${role.id}: ${text.substring(0, 200)}`,
        );
        throw new Error(`Scopes fetch failed for role ${role.id}: ${scopesRes.status}`);
      }

      return scopesResult.data;
    }),
  );

  // Aggregate and dedupe by `${resource.indicator}:${scope.name}` (mirrors
  // getUserScopes lines 360-381).
  const permissions: PersonalPermission[] = [];
  const seen = new Set<string>();
  let successfulFetches = 0;

  for (const result of scopeResults) {
    if (result.status === 'fulfilled') {
      successfulFetches++;
      for (const scope of result.value) {
        const resource = scope.resource;
        if (!resource?.indicator || !resource?.name) {
          warn(`[fetchPersonalRbacCore] Scope ${scope.id} missing resource info, skipping`);
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
    } else {
      warn(
        `[fetchPersonalRbacCore] Scope fetch failed for a role: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      );
    }
  }

  // Total scope-fetch failure: roles.length > 0 but no scope fetch succeeded
  // (mirrors getUserScopes:355-357).
  if (successfulFetches === 0) {
    throw plainCode('FETCH_FAILED');
  }

  return { roles, permissions };
}

// ============================================================================
// fetchOrgRbacCore
// ============================================================================

/**
 * Combined org RBAC fetch. Plain server-only async fn (NOT a Server Action),
 * safe to wrap with `React.cache()`. Accepts a SERVER-DERIVED `userId` (from
 * `fetchDashboardDataCore`'s `claims.sub`) and a server-resolved `orgId`
 * (from `Preferences.asOrg`). Throws on auth/fetch failure so the streamed
 * promise rejects into `<TabErrorBoundary>`.
 *
 * One complete paginated M2M org-roles list + N parallel complete paginated
 * org-role-scope lists. No introspection (userId passed in).
 *
 * Merges the work of `getOrganizationUserRoles` +
 * `getOrgPermissionsWithDescriptions`, eliminating the duplicate org-roles
 * GET.
 *
 * Does NOT call `getOrganizationUserPermissions` (the refresh-token grant —
 * BUG-L01). That grant stays lazy and runs only on explicit
 * `useOrgPermissions.refresh()` — a security improvement (fewer token
 * rotations).
 *
 * Returns `OrgRoleScope[]` (NOT a `Map`) — Maps are not RSC-serializable.
 * The client builds the `Map<string, OrgRoleScope>` (as `use-org-permissions.ts`
 * already does at lines 93-97).
 */
export async function fetchOrgRbacCore(userId: string, orgId: string): Promise<OrgRbacResult> {
  assertSafeLogtoId(userId, 'userId');
  assertSafeLogtoId(orgId, 'orgId');

  const token = await getManagementApiToken();
  const endpoint = getCleanEndpoint();

  // Step 1: fetch all pages of the user's org roles (also acts as membership check).
  const rolesUrl = `${endpoint}/api/organizations/${encodeURIComponent(orgId)}/users/${encodeURIComponent(userId)}/roles`;
  const rolesResult = await fetchAllManagementPages<UserRole>(rolesUrl, { token });

  if (!rolesResult.ok) {
    const rolesRes = rolesResult.response;
    const text = await rolesRes.text().catch(() => '');
    warn(
      `[fetchOrgRbacCore] Roles endpoint returned ${rolesRes.status} for user ${userId} in org ${orgId}: ${text.substring(0, 200)}`,
    );
    // 403/404 — user is not a member of this org (or org doesn't exist).
    // Return empty result so the UI shows "no roles" gracefully (mirrors
    // getOrgPermissionsWithDescriptions:345).
    if (rolesRes.status === 403 || rolesRes.status === 404) {
      return { roles: [], permissions: [] };
    }
    throw plainCode('FETCH_FAILED');
  }

  const rawRoles = rolesResult.data;

  if (rawRoles.length === 0) {
    return { roles: [], permissions: [] };
  }

  // Strip tenantId before returning to client (BUG-048).
  const roles: UserRole[] = rawRoles.map(({ tenantId: _t, ...rest }) => rest);

  // Step 2: fetch scopes for every role in parallel, tolerating individual failures.
  const scopeResults = await Promise.allSettled(
    roles.map(async (role) => {
      const scopesUrl = `${endpoint}/api/organization-roles/${encodeURIComponent(role.id)}/scopes`;
      const scopesResult = await fetchAllManagementPages<OrgRoleScope>(scopesUrl, { token });

      if (!scopesResult.ok) {
        const scopesRes = scopesResult.response;
        // BUG-L12: 404 means the role has no scopes. Treat as
        // empty success rather than a hard fetch failure, so that
        // one role without scopes does not sink the entire batch.
        if (scopesRes.status === 404) return [];
        const text = await scopesRes.text().catch(() => '');
        warn(
          `[fetchOrgRbacCore] Scopes endpoint returned ${scopesRes.status} for role ${role.id}: ${text.substring(0, 200)}`,
        );
        throw new Error(`Scopes fetch failed for role ${role.id}: ${scopesRes.status}`);
      }

      return scopesResult.data;
    }),
  );

  // Aggregate all scopes, dedupe by name (mirrors getOrgPermissionsWithDescriptions:370-387).
  const seen = new Set<string>();
  const permissions: OrgRoleScope[] = [];
  let successfulFetches = 0;

  for (const result of scopeResults) {
    if (result.status === 'fulfilled') {
      successfulFetches++;
      for (const scope of result.value) {
        if (scope.name && !seen.has(scope.name)) {
          seen.add(scope.name);
          // Strip tenantId before returning to client (BUG-048).
          const safeScope = { ...scope };
          Reflect.deleteProperty(safeScope, 'tenantId');
          permissions.push(safeScope as OrgRoleScope);
        }
      }
    } else {
      warn(
        `[fetchOrgRbacCore] Scope fetch failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      );
    }
  }

  // BUG-L10 guard: total scope-fetch failure (roles.length > 0 but no scope
  // fetch succeeded) is indistinguishable from "user has zero permissions"
  // and must NOT silently return [].
  if (successfulFetches === 0) {
    throw plainCode('FETCH_FAILED');
  }

  return { roles, permissions };
}
