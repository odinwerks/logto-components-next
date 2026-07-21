'use client';

import { useState, useCallback } from 'react';
import type { PersonalPermission } from '../logic/types';
import { loadPersonalPermissions } from '../server-actions';
import { useAsyncList } from './use-async-list';
import { useTooltipTrigger } from './use-tooltip-trigger';
import type { TooltipHandlers } from './use-tooltip-trigger';

export interface UsePersonalPermissionsReturn {
  /** List of personal (global RBAC) permissions */
  permissions: PersonalPermission[];
  /** Whether the fetch is in progress */
  loading: boolean;
  /** Error message if the last fetch failed, null otherwise */
  error: string | null;
  /** Whether the component should be rendered (useRefreshable visibility) */
  visible: boolean;
  /** Trigger a refresh (unmount/remount cycle via useRefreshable) */
  refresh: () => void;
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

export function usePersonalPermissions(initialData?: PersonalPermission[]): UsePersonalPermissionsReturn {
  const stableLoader = useCallback(() => {
    return loadPersonalPermissions();
  }, []);

  const { items, loading, error, visible, refresh } = useAsyncList<PersonalPermission[]>({
    loader: stableLoader,
    strategy: 'remount',
    initialData,
  });

  const { tooltip, handlers: baseHandlers } = useTooltipTrigger({ width: 288, height: 120 });
  const [activePermission, setActivePermission] = useState<PersonalPermission | null>(null);

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
    permissions: items,
    loading,
    error,
    visible,
    refresh,
    activePermission,
    tooltip,
    getTooltipHandlers,
  };
}
