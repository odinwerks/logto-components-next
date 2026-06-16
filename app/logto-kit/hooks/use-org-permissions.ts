'use client';

import { useReducer, useEffect } from 'react';
import type { OrgRoleScope } from '../logic/types';
import { loadOrganizationPermissions, loadOrgPermissionDescriptions } from '../server-actions';
import { useRefreshable } from './use-refreshable';

export interface UseOrgPermissionsOptions {
  orgId: string | null | undefined;
}

export interface UseOrgPermissionsReturn {
  permissions: string[];
  descriptions: Map<string, OrgRoleScope>;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
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

export function useOrgPermissions({ orgId }: UseOrgPermissionsOptions): UseOrgPermissionsReturn {
  const { visible, triggerRefresh } = useRefreshable();
  const [state, dispatch] = useReducer(permsReducer, initialState);

  useEffect(() => {
    if (!visible || !orgId) return;
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
        if (!cancelled) console.error('[useOrgPermissions] permissions failed:', err);
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
          console.error('[useOrgPermissions] descriptions failed:', err);
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

  return {
    permissions: state.permissions,
    descriptions: state.descriptions,
    isLoading: state.loading,
    error: state.error,
    refresh: triggerRefresh,
  };
}
