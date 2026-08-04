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
  sourceKey: string | null | undefined;
};

type ListAction<T> =
  | { type: 'start'; sourceKey: string | null | undefined; emptyItems: T }
  | { type: 'success'; sourceKey: string | null | undefined; data: T }
  | { type: 'error'; sourceKey: string | null | undefined; error: string }
  | { type: 'idle'; sourceKey: string | null | undefined; emptyItems: T };

function listReducer<T>(state: ListState<T>, action: ListAction<T>): ListState<T> {
  switch (action.type) {
    case 'start':
      // Same-source refreshes retain rows. A source identity change fails
      // closed so data from (for example) the prior organization cannot be
      // displayed while the new request is pending.
      return {
        items: state.sourceKey === action.sourceKey ? state.items : action.emptyItems,
        loading: true,
        error: null,
        sourceKey: action.sourceKey,
      };
    case 'success':
      return { items: action.data, loading: false, error: null, sourceKey: action.sourceKey };
    case 'error':
      return { ...state, loading: false, error: action.error, sourceKey: action.sourceKey };
    case 'idle':
      return {
        items: state.sourceKey === action.sourceKey ? state.items : action.emptyItems,
        loading: false,
        error: null,
        sourceKey: action.sourceKey,
      };
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
  const emptyItems = [] as unknown as T;
  const [state, dispatch] = useReducer(listReducer<T>, {
    items: (initialData ?? emptyItems),
    loading: enabled && initialData === undefined,
    error: null,
    sourceKey,
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
      // Invalidating the generation prevents stale completion, while this
      // explicit transition deterministically settles a pending spinner.
      dispatch({ type: 'idle', sourceKey, emptyItems });
      return;
    }

    const generation = ++generationRef.current;
    dispatch({ type: 'start', sourceKey, emptyItems });

    loader()
      .then((result) => {
        if (generation !== generationRef.current) return;
        if (result.ok) {
          dispatch({ type: 'success', sourceKey, data: result.data });
        } else {
          dispatch({ type: 'error', sourceKey, error: result.error });
        }
      })
      .catch((err) => {
        if (generation !== generationRef.current) return;
        const message = err instanceof Error ? err.message : 'FETCH_FAILED';
        dispatch({ type: 'error', sourceKey, error: message });
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

  // Effects run after render. Mask a mismatched snapshot synchronously so a
  // source switch cannot commit even one render containing prior-source rows.
  const stateMatchesSource = state.sourceKey === sourceKey;

  return {
    items: stateMatchesSource ? state.items : emptyItems,
    loading: active && (stateMatchesSource ? state.loading : true),
    error: stateMatchesSource ? state.error : null,
    visible,
    refresh,
  };
}
