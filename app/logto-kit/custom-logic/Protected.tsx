'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useOrgMode } from '../components/handlers/preferences';
import { useLogto } from '../components/handlers/logto-provider';
import { loadOrganizationPermissions } from '../actions/load-org-permissions';

interface ProtectedProps {
  children: ReactNode;
  perm?: string | string[];           // string = single, string[] = AND (all must have)
  orgId?: string | string[] | null;  // string = single, string[] = AND (must be in ALL)
  orgIdAny?: string[];               // OR mode - user must be in at least one
  orgName?: string | string[] | null;
  orgNameAny?: string[];
}

export function Protected({
  children,
  perm,
  orgId,
  orgIdAny,
  orgName,
  orgNameAny,
}: ProtectedProps) {
  const { asOrg } = useOrgMode();
  const { userData } = useLogto();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    if (!userData) {
      setLoading(false);
      setIsAuthorized(false);
      return;
    }

    setLoading(true);

    const checkAccess = (): boolean => {
      if (!userData?.organizations) {
        console.log('[Protected] No user organizations found');
        return false;
      }

      // Helper: resolve org names to IDs
      const resolveOrgNameToId = (name: string): string | null => {
        const org = userData.organizations!.find(org => org.name === name);
        return org ? org.id : null;
      };

      // Normalize AND requirements to arrays of org IDs
      const targetOrgIds: string[] = [];
      if (orgId) {
        if (Array.isArray(orgId)) {
          targetOrgIds.push(...orgId);
        } else {
          targetOrgIds.push(orgId);
        }
      }
      if (orgName) {
        const names = Array.isArray(orgName) ? orgName : [orgName];
        for (const name of names) {
          const id = resolveOrgNameToId(name);
          if (id) targetOrgIds.push(id);
        }
      }

      // Normalize OR requirements to arrays of org IDs
      const targetOrgIdsAny: string[] = [];
      if (orgIdAny) {
        targetOrgIdsAny.push(...orgIdAny);
      }
      if (orgNameAny) {
        for (const name of orgNameAny) {
          const id = resolveOrgNameToId(name);
          if (id) targetOrgIdsAny.push(id);
        }
      }

      // If no org requirements, allow access
      if (targetOrgIds.length === 0 && targetOrgIdsAny.length === 0) {
        return true;
      }

      // Check AND org requirements (must have ALL)
      const hasAllAndOrgs = targetOrgIds.every(targetId =>
        userData.organizations!.some(org => org.id === targetId)
      );

      if (!hasAllAndOrgs) {
        console.log('[Protected] User missing required AND org(s):', targetOrgIds);
        return false;
      }

      // Check OR org requirements (must have AT LEAST ONE)
      if (targetOrgIdsAny.length > 0) {
        const hasAnyOrOrg = targetOrgIdsAny.some(targetId =>
          userData.organizations!.some(org => org.id === targetId)
        );
        if (!hasAnyOrOrg) {
          console.log('[Protected] User not in any required OR org(s):', targetOrgIdsAny);
          return false;
        }
      }

      // Check permissions (always AND logic)
      const hasRequiredPerms = checkPermissions();
      if (!hasRequiredPerms) {
        console.log('[Protected] User lacks required permissions');
        return false;
      }

      // Check active org matches requirements
      const allRequiredOrgIds = [...targetOrgIds, ...targetOrgIdsAny];
      if (allRequiredOrgIds.length > 0 && !allRequiredOrgIds.includes(asOrg!)) {
        console.log('[Protected] Active org does not match requirements:', {
          required: allRequiredOrgIds,
          current: asOrg,
        });
        return false;
      }

      console.log('[Protected] Access granted:', {
        targetOrgIds,
        targetOrgIdsAny,
        hasAllAndOrgs: true,
        hasRequiredPerms: true,
        activeOrgMatches: true,
        availablePerms: permissions || [],
      });

      return true;
    };

    const checkPermissions = (): boolean => {
      if (!perm || (Array.isArray(perm) && perm.length === 0)) {
        return true;
      }

      if (!permissions) {
        console.log('[Protected] No organization permissions loaded yet');
        return false;
      }

      if (!Array.isArray(permissions)) {
        console.error('[Protected] organizationPermissions is not an array:', permissions);
        return false;
      }

      if (permissions.length === 0) {
        console.log('[Protected] User has no organization permissions');
        return false;
      }

      console.log('[Protected] Available organization permissions:', permissions);

      const requiredPerms = Array.isArray(perm) ? perm : [perm];
      const hasAllPerms = requiredPerms.every(requiredPerm => {
        const hasPerm = permissions!.includes(requiredPerm);

        console.log(`[Protected] Permission check for "${requiredPerm}":`, {
          hasPermission: hasPerm,
          availablePerms: permissions,
        });

        return hasPerm;
      });

      console.log('[Protected] Permission check summary:', {
        availablePerms: permissions,
        requiredPerms,
        hasAllPerms,
      });

      return hasAllPerms;
    };

    setIsAuthorized(checkAccess());
    setLoading(false);
  }, [userData, permissions, asOrg, perm, orgId, orgIdAny, orgName, orgNameAny]);

  useEffect(() => {
    if (!userData) {
      setPermissions(null);
      return;
    }

    let targetOrgId: string | null = null;
    if (orgId && !Array.isArray(orgId)) {
      targetOrgId = orgId;
    } else if (orgName && !Array.isArray(orgName) && userData.organizations) {
      const orgWithName = userData.organizations.find((org) => org.name === orgName);
      if (orgWithName) {
        targetOrgId = orgWithName.id;
      }
    } else if (asOrg) {
      targetOrgId = asOrg;
    }

    if (targetOrgId) {
      loadOrganizationPermissions(targetOrgId)
        .then(setPermissions)
        .catch(() => setPermissions([]));
    } else {
      setPermissions([]);
    }
  }, [userData, asOrg, orgId, orgIdAny, orgName, orgNameAny]);

  if (loading) {
    return <div>Loading authorization...</div>;
  }

  return isAuthorized ? <>{children}</> : null;
}