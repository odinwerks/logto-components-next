'use client';

import { useReducer, useEffect, useCallback, useState } from 'react';
import type { UserRole } from '../logic/types';
import { loadPersonalRoles } from '../server-actions';

interface RolesState {
  userRoles: UserRole[];
  loading: boolean;
  error: boolean;
}

type RolesAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: UserRole[] }
  | { type: 'FETCH_ERROR' };

function rolesReducer(state: RolesState, action: RolesAction): RolesState {
  switch (action.type) {
    case 'FETCH_START':
      return { userRoles: [], loading: true, error: false };
    case 'FETCH_SUCCESS':
      return { userRoles: action.data, loading: false, error: false };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: true };
  }
}

export interface UsePersonalRolesReturn {
  /** List of the user's personal (non-org) roles */
  userRoles: UserRole[];
  /** Whether the fetch is in progress */
  loading: boolean;
  /** Whether the last fetch failed */
  error: boolean;
  /** Trigger a refresh (re-fetch roles) */
  refresh: () => void;
}

export function usePersonalRoles(userId?: string): UsePersonalRolesReturn {
  const [{ userRoles, loading, error }, dispatch] = useReducer(rolesReducer, {
    userRoles: [],
    loading: true,
    error: false,
  });

  // Use a numeric refresh key so we can trigger re-fetch without
  // the useRefreshable unmount/remount pattern (roles are inline, not a separate component).
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    loadPersonalRoles()
      .then(r => {
        if (cancelled) return;
        if (r.ok) dispatch({ type: 'FETCH_SUCCESS', data: r.data });
        else {
          console.error('[usePersonalRoles] Failed to load roles:', r.error);
          dispatch({ type: 'FETCH_ERROR' });
        }
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[usePersonalRoles] Error loading roles:', err);
        dispatch({ type: 'FETCH_ERROR' });
      });

    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  return { userRoles, loading, error, refresh };
}
