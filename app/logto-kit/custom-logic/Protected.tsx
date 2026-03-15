import { getLogtoContext, getAccessToken } from '@logto/next/server-actions';
import { logtoConfig } from '../../logto';
import { fetchUserRbacData, validateRbac } from '../custom-actions/validation';

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

    const userId = claims.sub;

    const accessToken = await getAccessToken(logtoConfig, '');
    if (!accessToken) {
      return null;
    }

    const userData = await fetchUserRbacData(accessToken, orgId);

    const rbacResult = await validateRbac(userId, userData, { perm, role, requireAll });

    if (!rbacResult.ok) {
      console.log('[RBAC] Access denied:', rbacResult.error, rbacResult.detail);
      return null;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('[RBAC] Protected error:', error);
    return null;
  }
}
