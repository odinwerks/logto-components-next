import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '../../logto';
import { checkOrgPermission } from './actions/check-org-permission';
import { checkOrgRole } from './actions/check-org-role';
import { fetchUserDataForRbac } from './actions/fetch-userdata-for-rbac';

interface ProtectedProps {
  children: React.ReactNode;
  perm?: string | string[];
  role?: string | string[];
  orgId?: string | null;
  requireAll?: boolean;
}

export async function Protected({ children, perm, role, orgId, requireAll = true }: ProtectedProps) {
  try {
    const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);
    if (!isAuthenticated || !claims?.sub) {
      return null;
    }

    const userData = await fetchUserDataForRbac();
    const userOrgs = userData?.organizations ?? [];
    const targetOrgId = orgId ?? userData?.asOrg ?? null;

    if (targetOrgId) {
      if (!userOrgs || !userOrgs.includes(targetOrgId)) {
        return null;
      }
    }

    const reqRequireAll = requireAll ?? true;
    let permPassed = true;
    let rolePassed = true;

    if (perm) {
      const perms = Array.isArray(perm) ? perm : [perm];
      const results = await Promise.all(perms.map((p) => checkOrgPermission(p, targetOrgId)));
      permPassed = reqRequireAll ? results.every((r) => r) : results.some((r) => r);
    }

    if (role) {
      const roles = Array.isArray(role) ? role : [role];
      const results = await Promise.all(roles.map((r) => checkOrgRole(r, targetOrgId)));
      rolePassed = reqRequireAll ? results.every((r) => r) : results.some((r) => r);
    }

    let finalPass: boolean;
    if (perm && role) {
      finalPass = reqRequireAll ? (permPassed && rolePassed) : (permPassed || rolePassed);
    } else if (perm) {
      finalPass = permPassed;
    } else if (role) {
      finalPass = rolePassed;
    } else {
      finalPass = true;
    }

    if (!finalPass) {
      return null;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('[RBAC] Protected error:', error);
    return null;
  }
}
