'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';

export async function setActiveOrg(orgId: string | null): Promise<boolean> {
  // Always null is valid — user wants to be themselves (no org context).
  if (orgId === null) return true;

  // Use fetchUserInfo: true to get the live org list from the OIDC userinfo
  // endpoint, NOT the cached token claims. This matches how fetchDashboardData
  // reads orgs and handles the case where a user is added to an org after
  // sign-in (stale token would miss the new membership).
  const { isAuthenticated, userInfo } = await getLogtoContext(getLogtoConfig(), {
    fetchUserInfo: true,
  });

  if (!isAuthenticated) return false;

  const userOrgs = (userInfo?.organizations as string[] | undefined) ?? [];
  return userOrgs.includes(orgId);
}
