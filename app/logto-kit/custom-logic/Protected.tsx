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

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useOrgMode } from '../components/handlers/preferences';
import { useLogto } from '../components/handlers/logto-provider';
import { loadOrganizationPermissions } from '../actions/load-org-permissions';
import { debugLog } from '../logic/debug';

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
  orgId?: string | null;
  orgName?: string | null;
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function Protected({
  children,
  perm,
  orgId,
  orgName,
  requireAll = true,
  fallback,
}: ProtectedProps) {
  const { asOrg } = useOrgMode();
  const { userData } = useLogto();
  const [loadedPerms, setLoadedPerms] = useState<string[]>([]);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!userData || !orgId) return;

    hasLoadedRef.current = false;
    setLoadedPerms([]);
    setIsLoadingPerms(true);
  }, [asOrg, userData, orgId]);

  useEffect(() => {
    if (!userData || !orgId || !asOrg) return;
    if (hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    setIsLoadingPerms(true);
    loadOrganizationPermissions(orgId)
      .then((perms) => {
        setLoadedPerms(perms);
        setIsLoadingPerms(false);
      })
      .catch(() => {
        setIsLoadingPerms(false);
      });
  }, [userData, orgId, asOrg]);

  if (!userData) {
    return <>{fallback ?? null}</>;
  }

  if (isLoadingPerms) {
    return <>{fallback ?? null}</>;
  }

  const effectivePerms =
    loadedPerms.length > 0
      ? loadedPerms
      : asOrg
        ? userData.organizationPermissions || []
        : [];

  const checkAccess = (): boolean => {
    if (!userData?.organizations) {
      debugLog('[Protected] No user organizations found');
      return false;
    }

    if (!orgId && !orgName) {
      return true;
    }

    let targetOrgId: string;
    if (orgId) {
      targetOrgId = orgId;
    } else if (orgName) {
      const orgWithName = userData.organizations.find((org) => org.name === orgName);
      if (orgWithName) {
        targetOrgId = orgWithName.id;
      } else {
        debugLog('[Protected] Organization with name not found:', orgName);
        return false;
      }
    } else {
      return true;
    }

    const hasOrg = userData.organizations.some((org) => org.id === targetOrgId);
    if (!hasOrg) {
      debugLog('[Protected] User does not have required organization:', targetOrgId);
      return false;
    }

    const hasRequiredPerms = checkPermissions(targetOrgId, effectivePerms);
    if (!hasRequiredPerms) {
      debugLog('[Protected] User lacks required permissions in organization:', targetOrgId);
      return false;
    }

    const activeOrgMatches = asOrg === targetOrgId;
    if (!activeOrgMatches) {
      debugLog('[Protected] Organization not selected as active:', {
        required: targetOrgId,
        current: asOrg,
      });
      return false;
    }

    debugLog('[Protected] Access granted for org:', targetOrgId);

    return true;
  };

  const checkPermissions = (_organizationId: string, perms: string[]): boolean => {
    if (!perm || (Array.isArray(perm) && perm.length === 0)) {
      return true;
    }

    if (!perms || perms.length === 0) {
      debugLog('[Protected] No organization permissions available');
      return false;
    }

    debugLog('[Protected] Available organization permissions:', perms);

    const requiredPerms = Array.isArray(perm) ? perm : [perm];
    const permResults = requiredPerms.map((requiredPerm) => {
      const hasPerm = perms.includes(requiredPerm);

      debugLog(`[Protected] Permission check for "${requiredPerm}":`, {
        hasPermission: hasPerm,
        availablePerms: perms,
      });

      return hasPerm;
    });

    const hasRequiredPerms = requireAll
      ? permResults.every(Boolean)
      : permResults.some(Boolean);

    debugLog('[Protected] Permission check summary:', {
      _organizationId,
      availablePerms: perms,
      requiredPerms,
      requireAll,
      hasRequiredPerms,
    });

    return hasRequiredPerms;
  };

  const isAuthorized = checkAccess();

  return isAuthorized ? <>{children}</> : <>{fallback ?? null}</>;
}
