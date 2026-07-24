'use client';

import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import type { DataResult } from '../logic/actions/safe';
import { useRefreshable } from './use-refreshable';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RefreshStrategy = 'remount' | 'refetch';

export interface UseAsyncListOptions<T> {
  /** Stable loader. Must be memoized by the caller (useCallback). */
  loader: () => Promise<DataResult<T>>;
  /** Re-fetch when this key changes (e.g. orgId). undefined/null = fetch once. */
  sourceKey?: string | null | undefined;
  /** 'remount' = useRefreshable (unmount/remount, for leaf permission blocks).
    *  'refetch' = refreshKey (in-place re-fetch, for inline role lists). Default 'refetch'. */
  strategy?: RefreshStrategy;
  /** Skip fetch entirely when false. Default true. */
  enabled?: boolean;
  /**
   * Optional pre-fetched data used to seed `items` on first render and skip
   * the mount-effect fetch (instant-fetch / streaming pattern).
   *
   * - When `undefined` (default): legacy behavior — empty initial `items`,
   *   fetch on mount.
   * - When provided (including `[]`): seed `items` with the value, start
   *   `loading: false`, and skip the FIRST effect run only. Subsequent
   *   runs (from `sourceKey` / `refreshKey` / `visible` / `enabled`
   *   changes) still trigger fetches via the existing server-action path.
   *
   * This makes `initialData` purely additive: existing callers that omit it
   * see no behavior change, and the hook still re-fetches on org-switch
   * (`sourceKey` change) and on `refresh()`.
   */
  initialData?: T;
}

export interface UseAsyncListReturn<T> {
  items: T;
  loading: boolean;
  error: string | null;
  /** Always true for 'refetch'; toggles for 'remount' (gate render on this). */
  visible: boolean;
  refresh: () => void;
}

// ─── State ────────────────────────────────────────────────────────────────────

type ListState<T> = {
  items: T;
  loading: boolean;
  error: string | null;
};

type ListAction<T> =
  | { type: 'start' }
  | { type: 'success'; data: T }
  | { type: 'error'; error: string }
  | { type: 'reset'; items: T };

function listReducer<T>(state: ListState<T>, action: ListAction<T>): ListState<T> {
  switch (action.type) {
    case 'start':
      // Keep previous items while loading so the list doesn't flash empty
      return { ...state, loading: true, error: null };
    case 'success':
      return { items: action.data, loading: false, error: null };
    case 'error':
      return { ...state, loading: false, error: action.error };
    case 'reset':
      // Clear stale items from the previous source on sourceKey change
      // before the new fetch begins (BUG-M04).
      return { items: action.items, loading: false, error: null };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAsyncList<T>({
  loader,
  sourceKey,
  strategy = 'refetch',
  enabled = true,
  initialData,
}: UseAsyncListOptions<T>): UseAsyncListReturn<T> {
  const [state, dispatch] = useReducer(listReducer<T>, {
    items: (initialData ?? ([] as unknown as T)),
    loading: enabled && initialData === undefined,
    error: null,
  });

  const generationRef = useRef(0);
  const prevSourceKeyRef = useRef(sourceKey);
  // When `initialData` seeded the state on first render, skip the first
  // effect run so we don't immediately re-fetch the data we already have.
  // The ref is consumed on the first run and never reset — subsequent
  // sourceKey/refreshKey/visible changes still fetch via the normal path.
  const hasInitialDataRef = useRef(initialData !== undefined);

  // ── Refresh strategy wiring ──
  const { visible: remountVisible, triggerRefresh } = useRefreshable();
  const [refreshKey, setRefreshKey] = useState(0);

  const visible = strategy === 'remount' ? remountVisible : true;
  const active = enabled && (strategy === 'remount' ? visible : true);

  // ── Effect: fetch on sourceKey / refreshKey / visible change ──
  useEffect(() => {
    // Consume the initial-data skip flag on the very first effect run,
    // regardless of whether the hook is currently active.  This prevents the
    // flag from persisting across an enabled:false → enabled:true transition
    // (BUG-075): without this, the flag would survive the inactive run and
    // incorrectly skip the first *active* fetch.  When the hook IS active on
    // the first run, also skip the fetch (the data is already seeded).
    if (hasInitialDataRef.current) {
      hasInitialDataRef.current = false;
      if (active) return;
    }

    if (!active) {
      generationRef.current++;
      return;
    }

    // On sourceKey change with initialData, reset items to the seeded data
    // before the new fetch so stale data from the previous source is never
    // shown (BUG-M04). When initialData is undefined, preserve the legacy
    // "keep previous items while loading" behavior via the `start` action.
    const sourceKeyChanged = prevSourceKeyRef.current !== sourceKey;
    if (sourceKeyChanged && initialData !== undefined) {
      dispatch({ type: 'reset', items: initialData });
    }

    const generation = ++generationRef.current;
    dispatch({ type: 'start' });

    loader()
      .then((result) => {
        if (generation !== generationRef.current) return;
        if (result.ok) {
          dispatch({ type: 'success', data: result.data });
        } else {
          dispatch({ type: 'error', error: result.error });
        }
      })
      .catch((err) => {
        if (generation !== generationRef.current) return;
        const message = err instanceof Error ? err.message : 'FETCH_FAILED';
        dispatch({ type: 'error', error: message });
      });

    return () => {
      // Intentional: increment generation to cancel stale in-flight fetches
      // when the effect re-runs (sourceKey/refreshKey/visible change).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generationRef.current++;
    };
    // initialData is intentionally omitted from deps — it is a stable
    // seeding prop that should not trigger re-fetches on identity change.
    // For 'remount' strategy, sourceKey changes are routed through the
    // prevSourceKeyRef effect → triggerRefresh() → visible toggle path
    // (BUG-L09). Including sourceKey here would start a fetch that gets
    // immediately cancelled by the remount cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategy === 'remount' ? undefined : sourceKey, refreshKey, visible, active, loader]);

  // Track sourceKey changes for remount strategy to reset
  useEffect(() => {
    if (strategy === 'remount' && sourceKey !== prevSourceKeyRef.current) {
      prevSourceKeyRef.current = sourceKey;
      // Trigger a remount cycle when source key changes
      triggerRefresh();
    } else {
      prevSourceKeyRef.current = sourceKey;
    }
  }, [sourceKey, strategy, triggerRefresh]);

  const refresh = useCallback(() => {
    if (strategy === 'remount') {
      triggerRefresh();
    } else {
      setRefreshKey((k) => k + 1);
    }
  }, [strategy, triggerRefresh]);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    visible,
    refresh,
  };
}
