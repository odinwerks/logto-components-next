'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { PersonalRbacResult, OrgRbacResult } from '../../logic/types';

/**
 * ============================================================================
 * RbacPromisesProvider — client context for streamed RBAC promises
 * ============================================================================
 *
 * Exposes the personal/org RBAC promises kicked off in the `Dashboard` /
 * `MobileDashboard` RSCs (Phase 2 of the instant-fetch plan) to all tab
 * consumers without prop-drilling through `CrossFade` → tab → block.
 *
 * Contract:
 *   - `personalRbacPromise` is always provided for authenticated users
 *     (the RSC kicks it off unconditionally — profile is the default tab).
 *   - `orgRbacPromise` is `null` when no org is active, or a
 *     `Promise<OrgRbacResult>` when the user has an active org.
 *
 * Promise identity:
 *   The promises are created in the RSC (server-side) and passed as stable
 *   props. The provider value is memoized on the promise identities —
 *   re-renders of the shell with the same promise props do not create a
 *   new context value. The RSC re-creates the promises only on
 *   `router.refresh()` / org-switch, which is exactly when consumers
 *   should re-suspend via `use()`.
 *
 * Consumption:
 *   Stream consumers (`PersonalRolesStream`, `OrgRolesStream`, etc. in
 *   `dashboard/shared/rbac-streams.tsx`) call `use(promise)` inside
 *   `<Suspense>` boundaries. The `use()` call suspends until the promise
 *   resolves; the resolved value is then passed as `initialData` to the
 *   existing RBAC hooks so the mount-effect fetch is skipped.
 *
 * Tokens / IDOR:
 *   The promises resolve to plain serializable arrays
 *   (`UserRole[]`, `PersonalPermission[]`, `OrgRoleScope[]`). No access,
 *   refresh, M2M, or ID tokens cross the RSC boundary. The `userId` used
 *   to mint the promises is server-derived (NEVER-TOUCH IDOR rule).
 */

interface RbacPromisesValue {
  personalRbacPromise: Promise<PersonalRbacResult> | undefined;
  orgRbacPromise: Promise<OrgRbacResult> | null;
}

const RbacPromisesContext = createContext<RbacPromisesValue | null>(null);

interface RbacPromisesProviderProps {
  /** Streamed personal RBAC promise (roles + permissions). */
  personalRbacPromise: Promise<PersonalRbacResult> | undefined;
  /**
   * Streamed org RBAC promise. `null` when no org is active; `undefined`
   * is treated as `null` for safety (the RSC always passes either a
   * promise or `null`).
   */
  orgRbacPromise: Promise<OrgRbacResult> | null | undefined;
  children: ReactNode;
}

export function RbacPromisesProvider({
  personalRbacPromise,
  orgRbacPromise,
  children,
}: RbacPromisesProviderProps) {
  // Normalize undefined → null for the org promise so consumers can do a
  // simple null check without also handling undefined.
  const normalizedOrgPromise = orgRbacPromise ?? null;
  const value = useMemo<RbacPromisesValue>(
    () => ({ personalRbacPromise, orgRbacPromise: normalizedOrgPromise }),
    [personalRbacPromise, normalizedOrgPromise],
  );
  return (
    <RbacPromisesContext.Provider value={value}>
      {children}
    </RbacPromisesContext.Provider>
  );
}

export function useRbacPromises(): RbacPromisesValue {
  const ctx = useContext(RbacPromisesContext);
  if (!ctx) {
    throw new Error('useRbacPromises must be used within RbacPromisesProvider');
  }
  return ctx;
}
