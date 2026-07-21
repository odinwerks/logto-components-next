'use client';

import { useReducer, useEffect, useState, useRef } from 'react';
import type { OrgRoleScope } from '../logic/types';
import { loadOrganizationPermissions, loadOrgPermissionDescriptions } from '../server-actions';
import { useRefreshable } from './use-refreshable';
import { useTooltipTrigger } from './use-tooltip-trigger';
import type { TooltipHandlers } from './use-tooltip-trigger';
import { clientLog } from '../logic/client-logger';

export interface UseOrgPermissionsOptions {
  orgId: string | null | undefined;
  /**
   * Optional pre-fetched org permissions + descriptions (from the streamed
   * `orgRbacPromise`). When provided, the hook seeds its state and skips
   * BOTH the grant (`loadOrganizationPermissions`) AND the M2M
   * descriptions fetch (`loadOrgPermissionDescriptions`) on mount. On
   * `refresh()` (`triggerRefresh`), both run — the grant (refresh-token
   * rotation, BUG-L01) runs ONLY here, not on every mount — a security
   * improvement (fewer token rotations).
   */
  initialData?: { permissions: string[]; descriptions: Map<string, OrgRoleScope> };
}

export interface UseOrgPermissionsReturn {
  permissions: string[];
  descriptions: Map<string, OrgRoleScope>;
  loading: boolean;
  error: string | null;
  visible: boolean;
  refresh: () => void;
  /** The currently hovered/focused permission for the tooltip. null when no tooltip is active. */
  activePermission: string | null;
  /** Tooltip position and visibility state */
  tooltip: { visible: boolean; x: number; y: number };
  /** Returns tooltip event handlers bound to a specific permission string. */
  getTooltipHandlers: (permission: string) => TooltipHandlers;
}

type PermsState = {
  loading: boolean;
  permissions: string[];
  descriptions: Map<string, OrgRoleScope>;
  error: string | null;
};

type PermsAction =
  | { type: 'fetchStart' }
  | { type: 'fetchPermissionsDone'; permissions: string[] }
  | { type: 'fetchDescriptionsDone'; descriptions: Map<string, OrgRoleScope> }
  | { type: 'fetchDescriptionsError' }
  | { type: 'fetchDone' }
  | { type: 'fetchError'; error: string };

const initialState: PermsState = {
  loading: false,
  permissions: [],
  descriptions: new Map(),
  error: null,
};

function permsReducer(state: PermsState, action: PermsAction): PermsState {
  switch (action.type) {
    case 'fetchStart': return { ...state, loading: true, error: null };
    case 'fetchPermissionsDone': return { ...state, permissions: action.permissions };
    case 'fetchDescriptionsDone': return { ...state, descriptions: action.descriptions };
    case 'fetchDescriptionsError': return { ...state, descriptions: new Map() };
    case 'fetchDone': return { ...state, loading: false };
    case 'fetchError': return { loading: false, permissions: [], descriptions: new Map(), error: action.error };
  }
}

export function useOrgPermissions({ orgId, initialData }: UseOrgPermissionsOptions): UseOrgPermissionsReturn {
  const { visible, triggerRefresh } = useRefreshable();
  const [state, dispatch] = useReducer(permsReducer, initialData
    ? {
        loading: false,
        permissions: initialData.permissions,
        descriptions: initialData.descriptions,
        error: null,
      }
    : initialState);
  const { tooltip, handlers: baseHandlers } = useTooltipTrigger({ width: 288, height: 88 });
  const [activePermission, setActivePermission] = useState<string | null>(null);

  // When `initialData` seeded the state on first render, skip the first
  // effect run so we don't immediately re-fetch (and don't rotate the
  // refresh token) — the streamed data is already in state. The ref is
  // consumed on the first run; subsequent runs (orgId/visible changes,
  // including `refresh()` → visible toggle) fetch via the normal path.
  const hasInitialDataRef = useRef(!!initialData);

  useEffect(() => {
    if (!visible || !orgId) return;
    if (hasInitialDataRef.current) {
      hasInitialDataRef.current = false;
      return;
    }
    let cancelled = false;
    dispatch({ type: 'fetchStart' });

    const permissionsRequest = loadOrganizationPermissions(orgId)
      .then(r => {
        if (cancelled) return r;
        if (!r.ok) return r;
        dispatch({ type: 'fetchPermissionsDone', permissions: r.data });
        return r;
      })
      .catch(err => {
        if (!cancelled) clientLog.error('useOrgPermissions', 'permissions failed:', err);
        return null;
      });

    const descriptionsRequest = loadOrgPermissionDescriptions(orgId)
      .then(r => {
        if (cancelled) return r;
        if (!r.ok) {
          dispatch({ type: 'fetchDescriptionsError' });
          return r;
        }
        const map = new Map<string, OrgRoleScope>();
        for (const scope of r.data) {
          if (scope.name) map.set(scope.name, scope);
        }
        dispatch({ type: 'fetchDescriptionsDone', descriptions: map });
        return r;
      })
      .catch(err => {
        if (!cancelled) {
          clientLog.error('useOrgPermissions', 'descriptions failed:', err);
          dispatch({ type: 'fetchDescriptionsError' });
        }
        return null;
      });

    Promise.allSettled([permissionsRequest, descriptionsRequest]).then(([permResult]) => {
      if (cancelled) return;
      const permOk = permResult.status === 'fulfilled' && permResult.value?.ok;
      if (!permOk) {
        const errMsg = (permResult.status === 'fulfilled' && permResult.value && !permResult.value.ok)
          ? permResult.value.error
          : 'FETCH_FAILED';
        dispatch({ type: 'fetchError', error: errMsg });
      } else {
        dispatch({ type: 'fetchDone' });
      }
    });

    return () => { cancelled = true; };
  }, [orgId, visible]);

  const getTooltipHandlers = (permission: string): TooltipHandlers => ({
    onMouseEnter: (e) => {
      setActivePermission(permission);
      baseHandlers.onMouseEnter(e);
    },
    onMouseLeave: () => {
      setActivePermission(null);
      baseHandlers.onMouseLeave();
    },
    onFocus: (e) => {
      setActivePermission(permission);
      baseHandlers.onFocus(e);
    },
    onBlur: () => {
      setActivePermission(null);
      baseHandlers.onBlur();
    },
  });

  return {
    permissions: state.permissions,
    descriptions: state.descriptions,
    loading: state.loading,
    error: state.error,
    visible,
    refresh: triggerRefresh,
    activePermission,
    tooltip,
    getTooltipHandlers,
  };
}
