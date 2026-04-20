'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useOrgMode } from '../components/handlers/preferences';
import { useLogto } from '../components/handlers/logto-provider';
import { loadOrganizationPermissions } from '../actions/load-org-permissions';
import { debugLog } from '../logic/debug';

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
