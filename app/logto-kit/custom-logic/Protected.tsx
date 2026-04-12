'use client';

import { ReactNode } from 'react';
import { useOrgMode } from '../components/handlers/preferences';
import { useLogto } from '../components/handlers/logto-provider';

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

  if (!userData) {
    return <div>Loading authorization...</div>;
  }

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

    const hasRequiredPerms = checkPermissions(targetOrgId);
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
      availablePerms: userData.organizationPermissions || [],
    });

    return true;
  };

  const checkPermissions = (_organizationId: string): boolean => {
    if (!perm || (Array.isArray(perm) && perm.length === 0)) {
      return true;
    }

    if (!userData?.organizationPermissions) {
      console.log('[Protected] No organization permissions data available');
      console.log('[Protected] userData keys:', Object.keys(userData || {}));
      console.log('[Protected] userData.organizationPermissions:', userData?.organizationPermissions);
      return false;
    }

    if (!Array.isArray(userData.organizationPermissions)) {
      console.error('[Protected] organizationPermissions is not an array:', userData.organizationPermissions);
      return false;
    }

    if (userData.organizationPermissions.length === 0) {
      console.log('[Protected] User has no organization permissions - may still be loading');
      return false;
    }

    console.log('[Protected] Available organization permissions:', userData.organizationPermissions);

    const requiredPerms = Array.isArray(perm) ? perm : [perm];
    const permResults = requiredPerms.map((requiredPerm) => {
      const hasPerm = userData.organizationPermissions!.includes(requiredPerm);

      console.log(`[Protected] Permission check for "${requiredPerm}":`, {
        hasPermission: hasPerm,
        availablePerms: userData.organizationPermissions,
      });

      return hasPerm;
    });

    const hasRequiredPerms = requireAll
      ? permResults.every(Boolean)
      : permResults.some(Boolean);

    console.log('[Protected] Permission check summary:', {
      _organizationId,
      availablePerms: userData.organizationPermissions,
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
