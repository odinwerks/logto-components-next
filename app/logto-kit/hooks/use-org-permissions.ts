'use client';

import { useReducer, useEffect, useState, useRef, useCallback } from 'react';
import type { OrgRoleScope } from '../logic/types';
import { loadOrganizationPermissions, loadOrgPermissionDescriptions } from '../server-actions';
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
   * `refresh()`, both run — the grant (refresh-token rotation, BUG-L01)
   * runs ONLY here, not on every mount — a security improvement (fewer
   * token rotations).
   */
  initialData?: { permissions: string[]; descriptions: Map<string, OrgRoleScope> };
}

/**
 * Provenance: where the current display data came from.
 * - `'m2m-derived'`: seeded from the streamed M2M result (no live grant).
 * - `'live-audit'`: data from an explicit `refresh()` that ran the
 *   refresh-token live grant.
 */
export type OrgPermissionSource = 'm2m-derived' | 'live-audit';

/**
 * Audit status for the explicit live refresh path.
 * - `'idle'`: no explicit refresh has run (seeded M2M data showing).
 * - `'auditing'`: explicit refresh in flight (live grant running).
 * - `'live'`: explicit refresh succeeded — display data is from live audit.
 * - `'audit-error'`: explicit refresh failed — prior display rows retained.
 */
export type OrgPermissionAuditStatus = 'idle' | 'auditing' | 'live' | 'audit-error';

export interface UseOrgPermissionsReturn {
  permissions: string[];
  descriptions: Map<string, OrgRoleScope>;
  loading: boolean;
  error: string | null;
  visible: boolean;
  /** Trigger an explicit live refresh (refresh-token grant — BUG-L01). */
  refresh: () => void;
  /** Provenance of the current display data. */
  source: OrgPermissionSource;
  /** Audit status for the explicit live refresh path. */
  auditStatus: OrgPermissionAuditStatus;
  /** Error fetching descriptions only (permissions may still be present). */
  descriptionsError: string | null;
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
  descriptionsError: string | null;
  source: OrgPermissionSource;
  auditStatus: OrgPermissionAuditStatus;
};

type PermsAction =
  | { type: 'fetchStart' }
  | { type: 'auditStart' }
  | { type: 'fetchPermissionsDone'; permissions: string[] }
  | { type: 'fetchDescriptionsDone'; descriptions: Map<string, OrgRoleScope> }
  | { type: 'fetchDescriptionsError' }
  | { type: 'fetchDone' }
  | { type: 'fetchError'; error: string }
  | { type: 'auditSuccess' }
  | { type: 'auditError' };

const initialState: PermsState = {
  loading: false,
  permissions: [],
  descriptions: new Map(),
  error: null,
  descriptionsError: null,
  source: 'm2m-derived',
  auditStatus: 'idle',
};

function permsReducer(state: PermsState, action: PermsAction): PermsState {
  switch (action.type) {
    case 'fetchStart':
      return { ...state, loading: true, error: null };
    case 'auditStart':
      return { ...state, loading: true, error: null, auditStatus: 'auditing' };
    case 'fetchPermissionsDone':
      return { ...state, permissions: action.permissions };
    case 'fetchDescriptionsDone':
      return { ...state, descriptions: action.descriptions, descriptionsError: null };
    case 'fetchDescriptionsError':
      return { ...state, descriptions: new Map(), descriptionsError: 'DESCRIPTIONS_FAILED' };
    case 'fetchDone':
      return { ...state, loading: false };
    case 'fetchError':
      // Retain prior display rows on failed live audit — distinguish from
      // empty permissions. Clear permissions only on a non-audit fetch
      // error (the initial mount fetch).
      return {
        ...state,
        loading: false,
        error: action.error,
        auditStatus: state.auditStatus === 'auditing' ? 'audit-error' : state.auditStatus,
      };
    case 'auditSuccess':
      return { ...state, source: 'live-audit', auditStatus: 'live' };
    case 'auditError':
      return { ...state, auditStatus: 'audit-error' };
  }
}

export function useOrgPermissions({ orgId, initialData }: UseOrgPermissionsOptions): UseOrgPermissionsReturn {
  const [state, dispatch] = useReducer(permsReducer, initialData
    ? {
        loading: false,
        permissions: initialData.permissions,
        descriptions: initialData.descriptions,
        error: null,
        descriptionsError: null,
        source: 'm2m-derived' as OrgPermissionSource,
        auditStatus: 'idle' as OrgPermissionAuditStatus,
      }
    : { ...initialState, loading: !!orgId });

  const { tooltip, handlers: baseHandlers } = useTooltipTrigger({ width: 288, height: 88 });
  const [activePermission, setActivePermission] = useState<string | null>(null);

  // When `initialData` seeded the state on first render, skip the first
  // effect run so we don't immediately re-fetch (and don't rotate the
  // refresh token) — the streamed data is already in state. The ref is
  // consumed on the first run; subsequent runs (orgId/refreshNonce changes,
  // including `refresh()`) fetch via the normal path.
  const hasInitialDataRef = useRef(!!initialData);

  // In-place refresh nonce — replaces the visibility-remount strategy.
  // `refresh()` increments the nonce, which re-triggers the effect.
  // `visible` is always `true` for backward compatibility.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const visible = true;

  const refresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  // Track previous deps to detect whether refreshNonce actually changed
  // (vs. a different dep causing the effect to re-run, e.g. org switch).
  const prevDepsRef = useRef({ orgId, refreshNonce });

  useEffect(() => {
    if (!visible || !orgId) return;
    if (hasInitialDataRef.current) {
      hasInitialDataRef.current = false;
      return;
    }
    let cancelled = false;

    // isExplicitRefresh is true only when refreshNonce changed since the
    // previous effect run (not when it merely persisted across an org switch).
    const isExplicitRefresh = prevDepsRef.current.refreshNonce !== refreshNonce && refreshNonce > 0;
    prevDepsRef.current = { orgId, refreshNonce };

    if (isExplicitRefresh) {
      dispatch({ type: 'auditStart' });
    } else {
      dispatch({ type: 'fetchStart' });
    }

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
        if (isExplicitRefresh) {
          dispatch({ type: 'auditError' });
        }
      } else {
        dispatch({ type: 'fetchDone' });
        if (isExplicitRefresh) {
          dispatch({ type: 'auditSuccess' });
        }
      }
    });

    return () => { cancelled = true; };
  }, [orgId, visible, refreshNonce]);

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
    refresh,
    source: state.source,
    auditStatus: state.auditStatus,
    descriptionsError: state.descriptionsError,
    activePermission,
    tooltip,
    getTooltipHandlers,
  };
}
