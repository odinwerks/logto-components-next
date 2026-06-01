'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../config';
import { assertSafeLogtoId } from '../logic/guards';
import { updateUserCustomData } from '../logic/actions';

export async function setActiveOrg(orgId: string | null): Promise<boolean> {
  // null is valid - user wants to be themselves (no org context).
  if (orgId === null) {
    await updateUserCustomData({ Preferences: { asOrg: null } });
    return true;
  }
  if (!orgId) return false;

  assertSafeLogtoId(orgId, 'orgId');

  // Use fetchUserInfo: true to get the live org list from the OIDC userinfo
  // endpoint, NOT the cached token claims. This matches how fetchDashboardData
  // reads orgs and handles the case where a user is added to an org after
  // sign-in (stale token would miss the new membership).
  const { isAuthenticated, userInfo } = await getLogtoContext(getLogtoConfig(), {
    fetchUserInfo: true,
  });

  if (!isAuthenticated) return false;

  const rawOrgs = userInfo?.organizations;
  const userOrgs: string[] = Array.isArray(rawOrgs)
    ? rawOrgs.filter((o): o is string => typeof o === 'string')
    : [];

  const isValid = userOrgs.includes(orgId);

  // Persist the active org to Logto custom_data while we have the membership
  // result. This runs server-side and is awaited by callers before they update
  // client state, so by the time the client updates sessionStorage the server
  // source of truth is already consistent.
  if (isValid) {
    await updateUserCustomData({ Preferences: { asOrg: orgId } });
  }

  return isValid;
}
