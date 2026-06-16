'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Options for `useDataFetch`.
 */
interface UseDataFetchOptions<T> {
  /** Async function that returns the data to fetch. */
  fetcher: () => Promise<T>;
  /**
   * Dependency array — when any value changes the data will be re-fetched.
   * Defaults to `[]` (fetch once on mount).
   */
  deps?: React.DependencyList;
  /**
   * Whether to automatically fetch on mount and when deps change.
   * Defaults to `true`.
   */
  autoFetch?: boolean;
}

/**
 * Return value of `useDataFetch`.
 */
interface UseDataFetchResult<T> {
  /** The most recently fetched data, or null before the first successful fetch. */
  data: T | null;
  /** True while a fetch is in progress. */
  isLoading: boolean;
  /** Error message from the most recent failed fetch, or null. */
  error: string | null;
  /** Manually re-triggers the fetcher. Returns a promise that resolves when done. */
  refresh: () => Promise<void>;
}

/**
 * Generic data-fetching hook with loading/error state and manual refresh.
 *
 * Uses a stable `fetcherRef` so you can pass a new fetcher function each render
 * without invalidating the `execute` callback or triggering extra fetches.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refresh } = useDataFetch({
 *   fetcher: () => fetchUserRoles(userId),
 *   deps: [userId],
 * });
 * ```
 */
export function useDataFetch<T>(
  options: UseDataFetchOptions<T>
): UseDataFetchResult<T> {
  const { fetcher, deps = [], autoFetch = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to the latest fetcher so execute doesn't need it as a dep
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps -- deps is intentionally dynamic; callers own the array */
  useEffect(() => {
    if (autoFetch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void execute();
    }
  }, deps);
  /* eslint-enable react-hooks/exhaustive-deps */

  return { data, isLoading, error, refresh: execute };
}
