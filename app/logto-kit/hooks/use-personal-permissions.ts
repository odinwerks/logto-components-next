'use client';

import { useReducer, useEffect, useState } from 'react';
import type { PersonalPermission } from '../logic/types';
import { loadPersonalPermissions } from '../server-actions';
import { useRefreshable } from './use-refreshable';
import { useTooltipTrigger } from './use-tooltip-trigger';
import type { TooltipHandlers } from './use-tooltip-trigger';

interface PermState {
  permissions: PersonalPermission[];
  loading: boolean;
  error: boolean;
}

type PermAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: PersonalPermission[] }
  | { type: 'FETCH_ERROR' };

function permReducer(state: PermState, action: PermAction): PermState {
  switch (action.type) {
    case 'FETCH_START':
      return { permissions: [], loading: true, error: false };
    case 'FETCH_SUCCESS':
      return { permissions: action.data, loading: false, error: false };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: true };
  }
}

export interface UsePersonalPermissionsReturn {
  /** List of personal (global RBAC) permissions */
  permissions: PersonalPermission[];
  /** Whether the fetch is in progress */
  loading: boolean;
  /** Whether the last fetch failed */
  error: boolean;
  /** Whether the component should be rendered (useRefreshable visibility) */
  visible: boolean;
  /** Trigger a refresh (unmount/remount cycle via useRefreshable) */
  triggerRefresh: () => void;
  /**
   * The currently hovered/focused permission for the tooltip.
   * null when no tooltip is active.
   */
  activePermission: PersonalPermission | null;
  /** Tooltip position and visibility state */
  tooltip: { visible: boolean; x: number; y: number };
  /**
   * Returns tooltip event handlers bound to a specific permission.
   * Spread these onto the info button for each permission row.
   */
  getTooltipHandlers: (perm: PersonalPermission) => TooltipHandlers;
}

export function usePersonalPermissions(): UsePersonalPermissionsReturn {
  const [{ permissions, loading, error }, dispatch] = useReducer(permReducer, {
    permissions: [],
    loading: true,
    error: false,
  });

  const { visible, triggerRefresh } = useRefreshable();
  const { tooltip, handlers: baseHandlers } = useTooltipTrigger();
  const [activePermission, setActivePermission] = useState<PersonalPermission | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    loadPersonalPermissions()
      .then(r => {
        if (cancelled) return;
        if (r.ok) dispatch({ type: 'FETCH_SUCCESS', data: r.data });
        else {
          console.error('[usePersonalPermissions] Failed:', r.error);
          dispatch({ type: 'FETCH_ERROR' });
        }
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[usePersonalPermissions] Error:', err);
        dispatch({ type: 'FETCH_ERROR' });
      });

    return () => { cancelled = true; };
  }, [visible]);

  const getTooltipHandlers = (perm: PersonalPermission): TooltipHandlers => ({
    onMouseEnter: (e) => {
      setActivePermission(perm);
      baseHandlers.onMouseEnter(e);
    },
    onMouseLeave: () => {
      setActivePermission(null);
      baseHandlers.onMouseLeave();
    },
    onFocus: (e) => {
      setActivePermission(perm);
      baseHandlers.onFocus(e);
    },
    onBlur: () => {
      setActivePermission(null);
      baseHandlers.onBlur();
    },
  });

  return {
    permissions,
    loading,
    error,
    visible,
    triggerRefresh,
    activePermission,
    tooltip,
    getTooltipHandlers,
  };
}
