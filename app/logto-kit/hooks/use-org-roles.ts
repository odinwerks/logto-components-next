'use client';

import { useCallback } from 'react';
import type { UserRole } from '../logic/types';
import { loadOrganizationUserRoles } from '../server-actions';
import { useAsyncList } from './use-async-list';

export interface UseOrgRolesOptions {
  orgId: string | null | undefined;
  autoLoad?: boolean;
  /**
   * Optional pre-fetched org roles (from the streamed `orgRbacPromise`).
   * When provided, the hook seeds its state and skips the mount-effect
   * fetch; `refresh()` and `sourceKey` changes (org-switch) still fetch
   * via the existing server-action path.
   */
  initialData?: UserRole[];
}

export interface UseOrgRolesReturn {
  /** Authoritative M2M role list with real UUIDs + descriptions. NO name-keyed join. */
  roles: UserRole[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useOrgRoles({ orgId, autoLoad = true, initialData }: UseOrgRolesOptions): UseOrgRolesReturn {
  const stableLoader = useCallback(async () => {
    if (!orgId) {
      return { ok: false as const, error: 'NO_ORG_ID' };
    }
    return loadOrganizationUserRoles(orgId);
  }, [orgId]);

  const { items, loading, error, refresh } = useAsyncList<UserRole[]>({
    loader: stableLoader,
    sourceKey: orgId,
    strategy: 'refetch',
    enabled: autoLoad && !!orgId,
    initialData,
  });

  return {
    roles: items,
    loading,
    error,
    refresh,
  };
}
