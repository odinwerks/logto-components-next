import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDataFetch } from './use-data-fetch';

describe('useDataFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with null data, not loading, no error when autoFetch=false', () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 42 });
    const { result } = renderHook(() =>
      useDataFetch({ fetcher, autoFetch: false })
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('auto-fetches on mount when autoFetch=true (default)', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 99 });
    const { result } = renderHook(() => useDataFetch({ fetcher }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ value: 99 });
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('sets error when fetcher throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network failure'));
    const { result } = renderHook(() => useDataFetch({ fetcher }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network failure');
  });

  it('sets generic error message when non-Error is thrown', async () => {
    const fetcher = vi.fn().mockRejectedValue('raw string error');
    const { result } = renderHook(() => useDataFetch({ fetcher }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Unknown error');
  });

  it('refresh re-runs the fetcher and updates data', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });

    const { result } = renderHook(() => useDataFetch({ fetcher }));

    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 1 });
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual({ count: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('clears previous error on successful refresh', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('oops'))
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useDataFetch({ fetcher }));

    await waitFor(() => {
      expect(result.current.error).toBe('oops');
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({ ok: true });
  });

  it('refresh returns a stable reference across renders', async () => {
    const fetcher = vi.fn().mockResolvedValue(null);
    const { result, rerender } = renderHook(() =>
      useDataFetch({ fetcher, autoFetch: false })
    );

    const refresh1 = result.current.refresh;
    rerender();
    const refresh2 = result.current.refresh;

    expect(refresh1).toBe(refresh2);
  });

  it('re-fetches when deps array changes', async () => {
    let id = 1;
    const fetcher = vi.fn().mockImplementation(async () => ({ id }));

    const { result, rerender } = renderHook(() =>
      useDataFetch({ fetcher, deps: [id] })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 1 });
    });

    id = 2;
    rerender();

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 2 });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('stale response does not overwrite newer result (BUG-M21 race condition)', async () => {
    // fetcher#1 is slow, fetcher#2 resolves first
    let resolveFirst!: (v: unknown) => void;
    const firstFetch = new Promise((res) => { resolveFirst = res; });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return firstFetch;
      return Promise.resolve({ id: 2 });
    });

    let id = 1;
    const { result, rerender } = renderHook(() =>
      useDataFetch({ fetcher, deps: [id] })
    );

    // First fetch is in flight
    expect(result.current.isLoading).toBe(true);

    // Change deps — triggers second fetch
    id = 2;
    rerender();

    // Second fetch resolves immediately
    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 2 });
    });

    // Now resolve the stale first fetch
    resolveFirst({ id: 1, stale: true });

    // Data should still be from the second (newer) fetch
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.data).toEqual({ id: 2 });
  });
});
