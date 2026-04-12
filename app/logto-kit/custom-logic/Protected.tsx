'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useOrgMode } from '../components/handlers/preferences';
import { useLogto } from '../components/handlers/logto-provider';
import { loadOrganizationPermissions } from '../actions/load-org-permissions';

interface ProtectedProps {
  children: ReactNode;
  perm?: string | string[];
  orgId?: string | null;
  orgName?: string | null;
  requireAll?: boolean;
}

export function Protected({
  children,
  perm,
  orgId,
  orgName,
  requireAll = true,
}: ProtectedProps) {
  const { asOrg } = useOrgMode();
  const { userData } = useLogto();
  const [loadedPerms, setLoadedPerms] = useState<string[]>([]);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!userData || !orgId) return;
    if (hasLoadedRef.current) return;
    if (loadedPerms.length > 0) return;

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
  }, [userData, orgId, loadedPerms.length]);

  if (!userData) {
    return <div>Loading authorization...</div>;
  }

  if (isLoadingPerms) {
    return <div>Loading authorization...</div>;
  }

  const effectivePerms =
    loadedPerms.length > 0 ? loadedPerms : userData.organizationPermissions || [];

  const checkAccess = (): boolean => {
    if (!userData?.organizations) {
      console.log('[Protected] No user organizations found');
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
        console.log('[Protected] Organization with name not found:', orgName);
        return false;
      }
    } else {
      return true;
    }

    const hasOrg = userData.organizations.some((org) => org.id === targetOrgId);
    if (!hasOrg) {
      console.log('[Protected] User does not have required organization:', targetOrgId);
      return false;
    }

    const hasRequiredPerms = checkPermissions(targetOrgId, effectivePerms);
    if (!hasRequiredPerms) {
      console.log('[Protected] User lacks required permissions in organization:', targetOrgId);
      return false;
    }

    const activeOrgMatches = asOrg === targetOrgId;
    if (!activeOrgMatches) {
      console.log('[Protected] Organization not selected as active:', {
        required: targetOrgId,
        current: asOrg,
      });
      return false;
    }

    console.log('[Protected] Access granted:', {
      targetOrgId,
      hasOrg: true,
      hasRequiredPerms: true,
      activeOrgMatches: true,
      userOrgs: userData.organizations.map((org) => ({ id: org.id, name: org.name })),
      availablePerms: effectivePerms,
    });

    return true;
  };

  const checkPermissions = (_organizationId: string, perms: string[]): boolean => {
    if (!perm || (Array.isArray(perm) && perm.length === 0)) {
      return true;
    }

    if (!perms || perms.length === 0) {
      console.log('[Protected] No organization permissions available');
      return false;
    }

    console.log('[Protected] Available organization permissions:', perms);

    const requiredPerms = Array.isArray(perm) ? perm : [perm];
    const permResults = requiredPerms.map((requiredPerm) => {
      const hasPerm = perms.includes(requiredPerm);

      console.log(`[Protected] Permission check for "${requiredPerm}":`, {
        hasPermission: hasPerm,
        availablePerms: perms,
      });

      return hasPerm;
    });

    const hasRequiredPerms = requireAll
      ? permResults.every(Boolean)
      : permResults.some(Boolean);

    console.log('[Protected] Permission check summary:', {
      _organizationId,
      availablePerms: perms,
      requiredPerms,
      requireAll,
      permResults,
      hasRequiredPerms,
    });

    return hasRequiredPerms;
  };

  const isAuthorized = checkAccess();

  return isAuthorized ? <>{children}</> : null;
}
