'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../config';
import { assertSafeLogtoId } from '../logic/guards';
import { updateUserCustomData } from '../logic/actions';
import { safeAction, type DataResult } from '../logic/actions/safe';
import { plainCode } from '../logic/errors';
import { warn } from '../logic/log';

function warnNullOrgPersistFailure(): void {
  try {
    warn('[setActiveOrg] null persist failed:', 'UPDATE_FAILED');
  } catch {
    // Logging is best-effort and must not alter the action result.
  }
}

export async function setActiveOrg(orgId: string | null): Promise<DataResult<boolean>> {
  return safeAction(async () => {
    // null is valid - user wants to be themselves (no org context). There is no
    // membership to validate, but we still persist the personal-mode marker
    // server-side and inspect the result (BUG-027). We do NOT short-circuit before
    // updateUserCustomData so that a failed persist is at least observable.
    if (orgId === null) {
      const r = await updateUserCustomData({ Preferences: { asOrg: null } });
      if (!r.ok) {
        // CAN-ACT-011: route the operational signal through the SERVER-side
        // `warn` (gated only by LOG_BACKEND), NOT the client-gated `clientLog`
        // which `emit()` early-returns on when NEXT_PUBLIC_CLIENT_LOGS=false —
        // that combination left this branch with NO server-side observability
        // and returned a bare `false` that callers could not distinguish from
        // "not authenticated" / "org membership invalid". Do not log the
        // nested action's `r.error`: although safeAction normally sanitizes it,
        // this boundary must remain safe if that contract is ever bypassed.
        warnNullOrgPersistFailure();
        // Surface the failure via the safeAction envelope with a fixed code so
        // callers can distinguish a server-side persist failure from a benign
        // membership miss. `plainCode` produces a SanitizedError whose `.code`
        // is preserved by `safeAction` (preserve branch) and resolved by
        // `resolveClientCode` at the UPDATE_FAILED default verbosity ('specific',
        // exposeToClient: true) — so the client receives 'UPDATE_FAILED',
        // never the inner `r.error` or any raw upstream detail.
        throw plainCode('UPDATE_FAILED');
      }
      return true;
    }
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
  });
}
