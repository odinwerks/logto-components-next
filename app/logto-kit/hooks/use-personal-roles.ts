'use client';

import { useCallback } from 'react';
import type { UserRole } from '../logic/types';
import { loadPersonalRoles } from '../server-actions';
import { useAsyncList } from './use-async-list';

export interface UsePersonalRolesReturn {
  /** List of the user's personal (non-org) roles */
  roles: UserRole[];
  /** Whether the fetch is in progress */
  loading: boolean;
  /** Error message if the last fetch failed, null otherwise */
  error: string | null;
  /** Trigger a refresh (re-fetch roles) */
  refresh: () => void;
}

export function usePersonalRoles(userId?: string, initialData?: UserRole[]): UsePersonalRolesReturn {
  const stableLoader = useCallback(() => {
    return loadPersonalRoles();
  }, []);

  const { items, loading, error, refresh } = useAsyncList<UserRole[]>({
    loader: stableLoader,
    sourceKey: userId,
    strategy: 'refetch',
    enabled: !!userId,
    initialData,
  });

  return {
    roles: items,
    loading,
    error,
    refresh,
  };
}
