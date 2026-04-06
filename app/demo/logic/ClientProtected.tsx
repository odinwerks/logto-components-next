'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useOrgMode } from '../../logto-kit/components/handlers/preferences';
import { useLogto } from '../../logto-kit/components/handlers/logto-provider';
import { validateRbac } from '../../logto-kit/custom-actions/validation';
interface ClientProtectedProps {
  children: ReactNode;
  perm?: string | string[];
  orgId?: string | null;
  orgName?: string | null;
  requireAll?: boolean;
}

export function ClientProtected({
  children,
  perm,
  orgId,
  orgName,
  requireAll = true
}: ClientProtectedProps) {
  const { asOrg } = useOrgMode();
  const { userData } = useLogto();

  // Handle loading state while userData is being fetched
  if (!userData) {
    return <div>Loading authorization...</div>;
  }

  // Check organization membership, permission validation, and active selection
  const checkAccess = (): boolean => {
    if (!userData?.organizations) {
      console.log('[ClientProtected] No user organizations found');
      return false;
    }

    // If no org restriction, allow access
    if (!orgId && !orgName) {
      return true;
    }

    // Resolve org to actual ID
    let targetOrgId: string;
    if (orgId) {
      targetOrgId = orgId; // Assume it's already an ID
    } else if (orgName) {
      // For orgName, find the org with that name and get its ID
      const orgWithName = userData.organizations.find(org => org.name === orgName);
      if (orgWithName) {
        targetOrgId = orgWithName.id;
      } else {
        console.log('[ClientProtected] Organization with name not found:', orgName);
        return false;
      }
    } else {
      return true; // No restriction
    }

    // 1. Check if user has this organization
    const hasOrg = userData.organizations.some((org) => org.id === targetOrgId);
    if (!hasOrg) {
      console.log('[ClientProtected] User does not have required organization:', targetOrgId);
      return false;
    }

    // 2. Check permission validation within the organization context
    const hasRequiredPerms = checkPermissions(targetOrgId);
    if (!hasRequiredPerms) {
      console.log('[ClientProtected] User lacks required permissions in organization:', targetOrgId);
      return false;
    }

    // 3. Check if user has selected this organization as active
    const activeOrgMatches = asOrg === targetOrgId;
    if (!activeOrgMatches) {
      console.log('[ClientProtected] Organization not selected as active:', {
        required: targetOrgId,
        current: asOrg
      });
      return false;
    }

    console.log('[ClientProtected] Access granted:', {
      targetOrgId,
      hasOrg: true,
      hasRequiredPerms: true,
      activeOrgMatches: true,
      userOrgs: userData.organizations.map(org => ({ id: org.id, name: org.name })),
      availablePerms: userData.organizationPermissions || []
    });

    return true;
  };

  // Check permission requirements within the specified organization
  const checkPermissions = (organizationId: string): boolean => {
    // If no permission restriction, allow access
    if (!perm || (Array.isArray(perm) && perm.length === 0)) {
      return true;
    }

    if (!userData?.organizationPermissions) {
      console.log('[ClientProtected] No organization permissions data available');
      console.log('[ClientProtected] userData keys:', Object.keys(userData || {}));
      console.log('[ClientProtected] userData.organizationPermissions:', userData?.organizationPermissions);
      return false;
    }

    if (!Array.isArray(userData.organizationPermissions)) {
      console.error('[ClientProtected] organizationPermissions is not an array:', userData.organizationPermissions);
      return false;
    }

    if (userData.organizationPermissions.length === 0) {
      console.log('[ClientProtected] User has no organization permissions - may still be loading');
      // Don't immediately deny access, as permissions might still be loading
      return false;
    }

    console.log('[ClientProtected] Available organization permissions:', userData.organizationPermissions);

    // Check required permissions against available permissions
    const requiredPerms = Array.isArray(perm) ? perm : [perm];
    const permResults = requiredPerms.map(requiredPerm => {
      const hasPerm = userData.organizationPermissions!.includes(requiredPerm);

      console.log(`[ClientProtected] Permission check for "${requiredPerm}":`, {
        hasPermission: hasPerm,
        availablePerms: userData.organizationPermissions
      });

      return hasPerm;
    });

    // Apply requireAll logic
    const hasRequiredPerms = requireAll ? permResults.every(Boolean) : permResults.some(Boolean);

    console.log('[ClientProtected] Permission check summary:', {
      organizationId,
      availablePerms: userData.organizationPermissions,
      requiredPerms,
      requireAll,
      permResults,
      hasRequiredPerms
    });

    return hasRequiredPerms;
  };

  // Check full access hierarchy: org membership → role validation → active selection
  const isAuthorized = checkAccess();

  // Show children if authorized
  return isAuthorized ? <>{children}</> : null;
}