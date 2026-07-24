'use client';

/**
 * @fileoverview UI-only permission guard component for conditional rendering.
 *
 * ============================================================================
 * IMPORTANT: THIS IS NOT A SECURITY BOUNDARY
 * ============================================================================
 *
 * PURPOSE:
 * This is a UI convenience component for hiding/showing UI elements based on
 * permissions. It provides a better user experience by conditionally rendering
 * elements that the user doesn't have access to. It is NOT a security boundary.
 *
 * SECURITY MODEL:
 * - This component uses client-side state for permission checks
 * - Client-side checks can be bypassed via React DevTools, browser console,
 *   or by modifying the JavaScript bundle
 * - ALL actual security enforcement MUST happen server-side via the
 *   Protected Actions API (/api/protected routes)
 * - Never assume that because UI is hidden, the underlying action is protected
 *
 * CORRECT USAGE:
 * - Use this to conditionally render UI elements for improved UX
 * - NEVER put business logic inside components wrapped by Protected
 * - Always validate permissions server-side in the Protected Actions API
 * - Example: A "Delete User" button can be wrapped to hide it from users
 *   without permission, but the actual delete action MUST validate permissions
 *   in the server-side API route
 *
 * ANTI-PATTERNS TO AVOID:
 * - Don't rely on this component for security - it's purely cosmetic
 * - Don't put sensitive operations in components inside Protected
 * - Don't skip server-side validation because the UI is "hidden"
 * - Don't assume users can't access functionality just because they can't
 *   see the button
 *
 * @example
 * // Correct: UI guard with server-side enforcement
 * <Protected perm="delete:users" orgId={orgId}>
 *   <button onClick={() => deleteUser(id)}>Delete User</button>
 * </Protected>
 *
 * // In your API route (server-side):
 * // validatePermission('delete:users') // MUST be done server-side
 *
 * @example
 * // Incorrect: Relying solely on client-side protection
 * <Protected perm="admin" orgId={orgId}>
 *   <button onClick={() => performSensitiveOperation()}>
 *     Sensitive Action
 *   </button>
 * </Protected>
 * // WRONG: If performSensitiveOperation() doesn't validate server-side,
 * // any user could call it directly via the browser console
 */

import { ReactNode, useReducer, useEffect, useRef } from 'react';
import { useOrgMode } from '../components/providers/preferences';
import { useUserDataContext } from '../components/providers/user-data-context';
import { useToast } from '../components/providers/toast-provider';
import {
  loadOrganizationPermissions,
  loadPersonalRoles,
  loadPersonalPermissions,
  loadOrganizationUserRoles,
} from '../server-actions';
import { debugLog } from './debug';
import { clientLog } from './client-logger';

/**
 * Reducer state for permission/role loading.
 * Consolidates the load cycle plus the BUG-014 "keep-children-mounted during
 * a subsequent load" tracking into a single atomic state object. Using the
 * reducer (rather than refs/useState-direct-in-effect) keeps the lint rules
 * `react-hooks/refs` and `react-hooks/set-state-in-effect` satisfied:
 *   - `hasLoadedOnce` flips after the first *successful* load for the current
 *     scope and is reset to `false` by the `reset` action.
 *   - `lastAuthorized` records the authorization decision computed at the
 *     last successful load. It is preserved by the `loading` action so a
 *     subsequent load render can decide whether to keep showing children
 *     without touching any ref during render.
 */
interface PermState {
  loadedPerms: string[];
  loadedRoles: string[];
  isLoadingPerms: boolean;
  loadError: boolean;
  hasLoadedOnce: boolean;
  lastAuthorized: boolean;
}

type PermAction =
  | { type: 'reset' }
  | { type: 'loading' }
  | { type: 'success'; perms: string[]; roles: string[]; authorized: boolean }
  | { type: 'error' };

const initialPermState: PermState = {
  loadedPerms: [],
  loadedRoles: [],
  isLoadingPerms: false,
  loadError: false,
  hasLoadedOnce: false,
  lastAuthorized: false,
};

function permReducer(state: PermState, action: PermAction): PermState {
  switch (action.type) {
    case 'reset':
      return {
        loadedPerms: [],
        loadedRoles: [],
        isLoadingPerms: false,
        loadError: false,
        hasLoadedOnce: false,
        lastAuthorized: false,
      };
    case 'loading':
      // Preserve loadedPerms/loadedRoles/hasLoadedOnce/lastAuthorized so a
      // subsequent load (e.g. org switch) can keep showing the previously
      // authorized content instead of unmounting it (BUG-014).
      return { ...state, isLoadingPerms: true, loadError: false };
    case 'success':
      return {
        loadedPerms: action.perms,
        loadedRoles: action.roles,
        isLoadingPerms: false,
        loadError: false,
        hasLoadedOnce: true,
        lastAuthorized: action.authorized,
      };
    case 'error':
      // Blank stale perms/roles so a post-error render doesn't reuse them,
      // but keep hasLoadedOnce/lastAuthorized (an error screen returns fallback
      // regardless, so their exact values here don't affect rendering).
      return {
        ...state,
        loadedPerms: [],
        loadedRoles: [],
        isLoadingPerms: false,
        loadError: true,
      };
  }
}

type UserOrg = { id: string; name: string };

/**
 * Resolve the target org id from props, preferring explicit id over name
 * lookup. Pure (no `this`), so it can be called both during render and inside
 * the load `success` handler to compute the authorization decision.
 */
function resolveTargetOrgIdPure(
  orgId: string | null | undefined,
  orgName: string | null | undefined,
  organizations: UserOrg[] | undefined,
): string | undefined {
  if (orgId && orgId !== 'self') return orgId;
  if (orgName && organizations) {
    return organizations.find((o) => o.name === orgName)?.id;
  }
  return undefined;
}

interface AuthorizedInputs {
  perm?: string | string[];
  roleId?: string | string[];
  orgId?: string | null;
  orgName?: string | null;
  requireAll: boolean;
  asOrg: string | null;
  userData: { id?: string; organizations?: UserOrg[] } | null;
  loadedPerms: string[];
  loadedRoles: string[];
}

/**
 * Pure authorization computation shared by the render path and the load
 * `success` handler (the latter stores the result as `lastAuthorized` so the
 * next loading render can preserve children — BUG-014). Mirrors the previous
 * `checkAccess`/`checkPermissions` semantics exactly, including the strict
 * `asOrg === resolvedOrgId` check and the fail-safe "empty perms => deny"
 * rule (we never fall back to userData.organizationPermissions because that
 * array is unscoped and may carry permissions from ALL orgs).
 */
function computeAuthorized(i: AuthorizedInputs): boolean {
  const { perm, roleId, orgId, orgName, requireAll, asOrg, userData, loadedPerms, loadedRoles } = i;

  const isPersonalScope = orgId === 'self' || (!orgId && !orgName);
  if (isPersonalScope) {
    if (roleId) {
      const requiredRoles = Array.isArray(roleId) ? roleId : [roleId];
      const hasRoles = requireAll
        ? requiredRoles.every((r) => loadedRoles.includes(r))
        : requiredRoles.some((r) => loadedRoles.includes(r));
      if (!hasRoles) return false;
    }
    if (perm && (Array.isArray(perm) ? perm.length > 0 : true)) {
      const requiredPerms = Array.isArray(perm) ? perm : [perm];
      const hasPerms = requireAll
        ? requiredPerms.every((p) => loadedPerms.includes(p))
        : requiredPerms.some((p) => loadedPerms.includes(p));
      if (!hasPerms) return false;
    }
    return true;
  }

  if (!userData?.organizations) return false;

  const resolvedOrgId = resolveTargetOrgIdPure(orgId, orgName, userData.organizations);
  if (resolvedOrgId === undefined) {
    // orgName was specified but not found in the user's orgs
    if (orgName) return false;
    // No org scope — pass through
    return true;
  }

  // Strict asOrg check: content for org X is only visible when X is active.
  if (asOrg !== resolvedOrgId) return false;

  const hasOrg = userData.organizations.some((org) => org.id === resolvedOrgId);
  if (!hasOrg) return false;

  if (roleId) {
    const requiredRoles = Array.isArray(roleId) ? roleId : [roleId];
    const hasRoles = requireAll
      ? requiredRoles.every((r) => loadedRoles.includes(r))
      : requiredRoles.some((r) => loadedRoles.includes(r));
    if (!hasRoles) return false;
  }

  if (perm && (Array.isArray(perm) ? perm.length > 0 : true)) {
    // Fail-safe: no loaded org permissions => deny (don't fall back to
    // userData.organizationPermissions; that array is unscoped).
    if (!loadedPerms || loadedPerms.length === 0) return false;
    const requiredPerms = Array.isArray(perm) ? perm : [perm];
    const hasRequiredPerms = requireAll
      ? requiredPerms.every((p) => loadedPerms.includes(p))
      : requiredPerms.some((p) => loadedPerms.includes(p));
    if (!hasRequiredPerms) return false;
  }

  return true;
}

/**
 * Props for the Protected component.
 *
 * @property children - The React nodes to render if the user has the required permissions
 * @property perm - A single permission string or array of permission strings to check.
 *                  If omitted, only organization membership is checked.
 * @property orgId - The organization ID to check permissions against. Either orgId or
 *                   orgName should be provided for organization-specific checks.
 * @property orgName - Alternative to orgId: looks up the organization by name.
 * @property requireAll - When perm is an array, if true (default) the user must have
 *                        ALL permissions; if false, having ANY permission is sufficient.
 * @property fallback - Optional React nodes to render when the user lacks permissions.
 *                      If not provided, nothing is rendered.
 */
interface ProtectedProps {
  children: ReactNode;
  perm?: string | string[];
  roleId?: string | string[];
  orgId?: string | null;
  orgName?: string | null;
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function Protected({
  children,
  perm,
  roleId,
  orgId,
  orgName,
  requireAll = true,
  fallback,
}: ProtectedProps) {
  const { asOrg } = useOrgMode();
  const userData = useUserDataContext();
  const [state, dispatch] = useReducer(permReducer, initialPermState);
  const { loadedPerms, loadedRoles, isLoadingPerms, loadError, hasLoadedOnce, lastAuthorized } = state;

  // ── Denial toast: fire on authorized → unauthorized transition ───────────
  const { showToast, mapErrorToast } = useToast();
  const wasAuthorizedRef = useRef(false);

  /** Resolve orgId from props, preferring explicit id over name lookup. */
  function resolveTargetOrgId(): string | undefined {
    return resolveTargetOrgIdPure(orgId, orgName, userData?.organizations);
  }

  const targetOrgId = resolveTargetOrgId();

  // ── Effect 1: Personal-scope permission loading ──────────────────────────
  // Personal permissions are org-independent; asOrg changes (org switches)
  // must NOT trigger a re-fetch here (BUG-M05). This effect omits asOrg
  // and targetOrgId from its dep array, only re-fetching when user identity
  // or personal scope definition (orgId/orgName) changes.
  useEffect(() => {
    if (!userData?.id) return; // Reset handled by effect 2

    const isPersonalScope = orgId === 'self' || (!orgId && !orgName);
    if (!isPersonalScope) return;

    let cancelled = false;
    dispatch({ type: 'loading' });

    Promise.all([
      loadPersonalPermissions(),
      loadPersonalRoles(),
    ])
      .then(([permsRes, rolesRes]) => {
        if (!cancelled) {
          const perms = permsRes.ok
            ? permsRes.data.map((p) => p.scope)
            : (clientLog.error('Protected', 'permissions load failed:', permsRes.error), []);
          const roles = rolesRes.ok
            ? rolesRes.data.map((r) => r.id)
            : (clientLog.error('Protected', 'roles load failed:', rolesRes.error), []);
          const authorized = computeAuthorized({
            perm, roleId, orgId, orgName, requireAll, asOrg, userData, loadedPerms: perms, loadedRoles: roles,
          });
          dispatch({ type: 'success', perms, roles, authorized });
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id, orgId, orgName]);

  // ── Effect 2: Organization-scope permission loading ──────────────────────
  // Org permissions depend on the active org (asOrg). This effect includes
  // targetOrgId and asOrg in its dep array so it re-fetches on org switches.
  useEffect(() => {
    // Guard: need userData to proceed; reset if user logged out.
    if (!userData?.id) {
      dispatch({ type: 'reset' });
      return;
    }

    const isPersonalScope = orgId === 'self' || (!orgId && !orgName);
    if (isPersonalScope) return; // Handled by effect 1

    // Organization scope
    if (targetOrgId && targetOrgId !== 'self') {
      if (asOrg !== targetOrgId) {
        dispatch({ type: 'reset' });
        return;
      }
    }

    if (!targetOrgId || asOrg !== targetOrgId) {
      dispatch({ type: 'reset' });
      return;
    }

    // Start loading
    let cancelled = false;
    dispatch({ type: 'loading' });

    Promise.all([
      loadOrganizationPermissions(targetOrgId),
      loadOrganizationUserRoles(targetOrgId),
    ])
      .then(([permsRes, rolesRes]) => {
        if (!cancelled) {
          const perms = permsRes.ok
            ? permsRes.data
            : (clientLog.error('Protected', 'org permissions load failed:', permsRes.error), []);
          const roles = rolesRes.ok
            ? rolesRes.data.map((r) => r.id)
            : (clientLog.error('Protected', 'org roles load failed:', rolesRes.error), []);
          const authorized = computeAuthorized({
            perm, roleId, orgId, orgName, requireAll, asOrg, userData, loadedPerms: perms, loadedRoles: roles,
          });
          dispatch({ type: 'success', perms, roles, authorized });
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, orgId, orgName, targetOrgId, asOrg]);

  // Compute isAuthorized once for both the denial toast effect and the render path.
  const isAuthorized = computeAuthorized({
    perm,
    roleId,
    orgId,
    orgName,
    requireAll,
    asOrg,
    userData,
    loadedPerms,
    loadedRoles,
  });

  // ── Denial toast: fire on authorized → unauthorized transition ───────────
  // Only for permission-based checks (not the initial loading state or org switches).
  useEffect(() => {
    if (hasLoadedOnce && wasAuthorizedRef.current && !isAuthorized && !isLoadingPerms && !loadError) {
      // Only fire for perm-based checks; org-switch is expected behavior.
      if (perm) {
        showToast('error', mapErrorToast('PERMISSION_DENIED'));
      }
    }
    if (hasLoadedOnce) {
      wasAuthorizedRef.current = isAuthorized;
    }
  }, [isAuthorized, hasLoadedOnce, isLoadingPerms, loadError, perm, showToast, mapErrorToast]);

  if (!userData) {
    return <>{fallback ?? null}</>;
  }

  if (isLoadingPerms) {
    // BUG-014: on a *subsequent* load, preserve the previously authorized
    // content instead of unmounting it (which caused layout shift and loss of
    // child state on every org switch / router.refresh()). Only preserve when
    // the last successful load was authorized — otherwise we keep showing the
    // fallback (this also avoids briefly revealing content that was hidden for
    // being unauthorized). First load behaves as before (fallback ?? null).
    // `hasLoadedOnce` and `lastAuthorized` live in reducer state (not refs) so
    // we never read/write a ref during render.
    if (hasLoadedOnce && lastAuthorized) {
      return <>{children}</>;
    }
    return <>{fallback ?? null}</>;
  }

  if (loadError) {
    return <>{fallback ?? null}</>;
  }

  if (isAuthorized) {
    debugLog('[Protected] Access granted', {
      scope: isPersonalScopeFor(orgId, orgName) ? 'personal' : targetOrgId,
      perms: loadedPerms,
      roles: loadedRoles,
    });
  } else {
    debugLog('[Protected] Access denied', {
      scope: isPersonalScopeFor(orgId, orgName) ? 'personal' : targetOrgId,
      asOrg,
      requiredOrg: targetOrgId,
      perms: loadedPerms,
      roles: loadedRoles,
    });
  }

  return isAuthorized ? <>{children}</> : <>{fallback ?? null}</>;
}

/** Small helper duplicated locally to avoid leaking `isPersonalScope` flags. */
function isPersonalScopeFor(orgId: string | null | undefined, orgName: string | null | undefined): boolean {
  return orgId === 'self' || (!orgId && !orgName);
}