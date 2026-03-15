'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '../../logto';
import { checkOrgPermission } from './actions/check-org-permission';
import { checkOrgRole } from './actions/check-org-role';
import { fetchUserDataForRbac } from './actions/fetch-userdata-for-rbac';
import type { ProtectedRequirements, ProtectedResult } from './types';

export async function runProtected<T>(
  requirements: Omit<ProtectedRequirements, 'userData'>,
  action: () => Promise<T>
): Promise<ProtectedResult<T>> {
  try {
    const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);
    
    if (!isAuthenticated || !claims?.sub) {
      return { ok: false, reason: 'VALIDATION_ERROR', detail: 'Not authenticated' };
    }

    const userData = await fetchUserDataForRbac();
    const userOrgs = userData?.organizations ?? [];
    const orgId = requirements.orgId ?? userData?.asOrg ?? null;

    if (orgId) {
      if (!userOrgs || !userOrgs.includes(orgId)) {
        return { ok: false, reason: 'ORG_MISMATCH', detail: 'User not in this organization' };
      }
    }

    const requireAll = requirements.requireAll ?? true;
    let permPassed = true;
    let rolePassed = true;

    if (requirements.perm) {
      const perms = Array.isArray(requirements.perm) ? requirements.perm : [requirements.perm];
      const results = await Promise.all(perms.map(p => checkOrgPermission(p, orgId)));
      permPassed = requireAll ? results.every(Boolean) : results.some(Boolean);
    }

    if (requirements.role) {
      const roles = Array.isArray(requirements.role) ? requirements.role : [requirements.role];
      const results = await Promise.all(roles.map(r => checkOrgRole(r, orgId)));
      rolePassed = requireAll ? results.every(Boolean) : results.some(Boolean);
    }

    let finalPass: boolean;
    if (requirements.perm && requirements.role) {
      finalPass = requireAll ? (permPassed && rolePassed) : (permPassed || rolePassed);
    } else if (requirements.perm) {
      finalPass = permPassed;
    } else if (requirements.role) {
      finalPass = rolePassed;
    } else {
      finalPass = true;
    }

    if (!finalPass) {
      return { ok: false, reason: 'MISSING_PERM' };
    }

    const data = await action();
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, reason: 'VALIDATION_ERROR', detail: message };
  }
}
