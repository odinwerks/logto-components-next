'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../config';
import { assertSafeLogtoId } from '../logic/guards';
import { updateUserCustomData } from '../logic/actions';
import { clientLog } from '../logic/client-logger';

export async function setActiveOrg(orgId: string | null): Promise<boolean> {
  // null is valid - user wants to be themselves (no org context). There is no
  // membership to validate, but we still persist the personal-mode marker
  // server-side and inspect the result (BUG-027). We do NOT short-circuit before
  // updateUserCustomData so that a failed persist is at least observable.
  if (orgId === null) {
    const r = await updateUserCustomData({ Preferences: { asOrg: null } });
    if (!r.ok) {
      clientLog.warn('setActiveOrg', 'null persist failed:', r.error);
      return false;
    }
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

  // NOTE: We intentionally do NOT persist here (BUG-015). setActiveOrg is the
  // server-side membership validator only; the single authoritative write of
  // Preferences.asOrg is performed by the client via setAsOrg()'s persistOrg
  // after this function resolves. This avoids the double PATCH
  // /api/users/{id}/custom-data that previously fired on every org switch.

  return isValid;
}
