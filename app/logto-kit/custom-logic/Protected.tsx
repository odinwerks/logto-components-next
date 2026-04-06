import { getLogtoContext, getAccessToken } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../logto';
import { fetchUserRbacData, validateRbac } from '../custom-actions/validation';


interface ProtectedProps {
  children: React.ReactNode;
  perm?: string | string[]; // Changed from 'role' to 'perm'
  orgId?: string | null;
  orgName?: string | null;
  requireAll?: boolean;
}

export async function Protected({ children, perm, orgId, orgName, requireAll = true }: ProtectedProps) {
  try {
    const { claims, isAuthenticated } = await getLogtoContext(getLogtoConfig());
    if (!isAuthenticated || !claims?.sub) {
      return null;
    }

    const userId = claims.sub;

    const accessToken = await getAccessToken(getLogtoConfig(), '');
    if (!accessToken) {
      return null;
    }

    const userData = await fetchUserRbacData(accessToken, orgId);

    const rbacResult = await validateRbac(userId, userData, { perm, requireAll });

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
