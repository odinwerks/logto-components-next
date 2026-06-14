import { assertSafeLogtoId } from '../logic/guards';
import {
  getUserRoles,
  getUserScopes,
  getOrganizationUserRoles,
  getOrganizationUserPermissions,
  getOrgPermissionsWithDescriptions,
} from '../logic/actions';

// ── Factory helpers ──────────────────────────────────────────────────────────

/**
 * Wraps a zero-arg async function as a server action.
 * Used by personal loaders that don't require an id parameter.
 */
function createSimpleLoader<T>(fn: () => Promise<T>): () => Promise<T> {
  return async () => fn();
}

/**
 * Wraps an `(id: string) => Promise<T>` as a server action,
 * optionally validating the id with `assertSafeLogtoId`.
 */
function createIdLoader<T>(
  fn: (id: string) => Promise<T>,
  requireGuard = false,
): (id: string) => Promise<T> {
  if (requireGuard) {
    return async (id: string) => {
      assertSafeLogtoId(id, 'orgId');
      return fn(id);
    };
  }
  return fn;
}

// ── Personal loaders (no id needed) ──────────────────────────────────────────

export const loadPersonalRoles = createSimpleLoader(getUserRoles);
export const loadPersonalPermissions = createSimpleLoader(getUserScopes);

// ── Org loaders (id required, guard on permission lookups) ───────────────────

export const loadOrganizationUserRoles = createIdLoader(
  getOrganizationUserRoles,
  true, // requireGuard = true
);
export const loadOrganizationPermissions = createIdLoader(
  getOrganizationUserPermissions,
  true,
);
export const loadOrgPermissionDescriptions = createIdLoader(
  getOrgPermissionsWithDescriptions,
  true,
);
