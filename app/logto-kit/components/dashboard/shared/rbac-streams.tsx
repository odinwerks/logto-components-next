'use client';

import { use, type ReactNode } from 'react';
import { useRbacPromises } from '../../providers/rbac-stream-context';
import type {
  UserRole,
  PersonalPermission,
  OrgRoleScope,
  PersonalRbacResult,
  OrgRbacResult,
} from '../../../logic/types';

/**
 * ============================================================================
 * RbacStream consumers — `use(promise)` + `<Suspense>` wrappers
 * ============================================================================
 *
 * Small wrapper components that call React 19 `use(promise)` inside a
 * Suspense-compatible boundary and pass the resolved data as `initialData`
 * to the existing RBAC hooks. Kept as separate components so `use()` is
 * never called conditionally (Rules of Hooks / React 19 `use()` contract).
 *
 * Usage at the call site (e.g. `profile.tsx`):
 *
 *   <Suspense fallback={<BouncingDots ... />}>
 *     <PersonalRolesStream
 *       render={(initialRoles) => <PersonalRolesList initialRoles={initialRoles} ... />}
 *     />
 *   </Suspense>
 *
 * The render prop receives the streamed data (or `undefined` when the
 * promise is missing — in which case the consumer's hook falls back to
 * its normal mount-fetch).
 *
 * IDOR / token containment:
 *   The resolved values are plain serializable arrays. No tokens cross
 *   the boundary. The `userId` used to mint the promises is server-derived.
 */

// ─── Personal roles ─────────────────────────────────────────────────────────

export function PersonalRolesStream({
  render,
}: {
  /**
   * Render prop receiving the streamed roles. Called with `undefined` when
   * no promise is available — the downstream hook fetches on mount.
   */
  render: (initialData: UserRole[] | undefined) => ReactNode;
}) {
  const { personalRbacPromise } = useRbacPromises();
  if (!personalRbacPromise) {
    // No promise (defensive — the RSC always provides one for authenticated
    // users). Render with undefined so the hook fetches on mount.
    return <>{render(undefined)}</>;
  }
  return <PersonalRolesResolved promise={personalRbacPromise} render={render} />;
}

function PersonalRolesResolved({
  promise,
  render,
}: {
  promise: Promise<PersonalRbacResult>;
  render: (initialData: UserRole[] | undefined) => ReactNode;
}) {
  const data = use(promise);
  return <>{render(data.roles)}</>;
}

// ─── Personal permissions ───────────────────────────────────────────────────

export function PersonalPermissionsStream({
  render,
}: {
  render: (initialData: PersonalPermission[] | undefined) => ReactNode;
}) {
  const { personalRbacPromise } = useRbacPromises();
  if (!personalRbacPromise) {
    return <>{render(undefined)}</>;
  }
  return <PersonalPermissionsResolved promise={personalRbacPromise} render={render} />;
}

function PersonalPermissionsResolved({
  promise,
  render,
}: {
  promise: Promise<PersonalRbacResult>;
  render: (initialData: PersonalPermission[] | undefined) => ReactNode;
}) {
  const data = use(promise);
  return <>{render(data.permissions)}</>;
}

// ─── Org roles ──────────────────────────────────────────────────────────────

export function OrgRolesStream({
  render,
}: {
  /**
   * Render prop receiving the streamed org roles. Called with `undefined`
   * when no promise is available — the downstream hook fetches on mount.
   * The caller is responsible for rendering the "no active org" fallback
   * OUTSIDE the stream when `activeOrgId` is null (the stream itself
   * cannot distinguish "no org" from "active org but no pre-fetched
   * promise" — both look like `orgRbacPromise === null`).
   */
  render: (initialData: UserRole[] | undefined) => ReactNode;
}) {
  const { orgRbacPromise } = useRbacPromises();
  if (!orgRbacPromise) {
    // No promise — could be "no active org" OR "active org but RSC didn't
    // pre-fetch" (e.g., during the interim between org-switch and
    // router.refresh()). Either way, render the render prop with
    // `undefined` so the downstream hook decides whether to fetch.
    return <>{render(undefined)}</>;
  }
  return <OrgRolesResolved promise={orgRbacPromise} render={render} />;
}

function OrgRolesResolved({
  promise,
  render,
}: {
  promise: Promise<OrgRbacResult>;
  render: (initialData: UserRole[] | undefined) => ReactNode;
}) {
  const data = use(promise);
  return <>{render(data.roles)}</>;
}

// ─── Org permissions ────────────────────────────────────────────────────────

export function OrgPermissionsStream({
  render,
}: {
  /**
   * Render prop receiving the streamed org permissions. The `permissions`
   * field is the array of scope NAMES (`string[]` — what the hook's
   * `state.permissions` stores), derived client-side from the streamed
   * `OrgRoleScope[]`. The `descriptions` `Map<string, OrgRoleScope>` is
   * also built CLIENT-SIDE (Maps are not RSC-serializable).
   *
   * Called with `undefined` when no promise is available — the downstream
   * hook fetches on mount.
   */
  render: (
    initialData: { permissions: string[]; descriptions: Map<string, OrgRoleScope> } | undefined,
  ) => ReactNode;
}) {
  const { orgRbacPromise } = useRbacPromises();
  if (!orgRbacPromise) {
    return <>{render(undefined)}</>;
  }
  return <OrgPermissionsResolved promise={orgRbacPromise} render={render} />;
}

function OrgPermissionsResolved({
  promise,
  render,
}: {
  promise: Promise<OrgRbacResult>;
  render: (
    initialData: { permissions: string[]; descriptions: Map<string, OrgRoleScope> } | undefined,
  ) => ReactNode;
}) {
  const data = use(promise);
  // Build the descriptions Map and permission-names array client-side from
  // the streamed `OrgRoleScope[]`. Mirrors the existing pattern in
  // useOrgPermissions (lines 93-97) — the Map and the bare-names array are
  // client-only constructs, never serialized across the RSC boundary.
  const descriptions = new Map<string, OrgRoleScope>();
  const permissions: string[] = [];
  for (const scope of data.permissions) {
    if (scope.name) {
      descriptions.set(scope.name, scope);
      permissions.push(scope.name);
    }
  }
  return <>{render({ permissions, descriptions })}</>;
}
