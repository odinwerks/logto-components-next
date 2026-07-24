import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncList } from './use-async-list';
import type { DataResult } from '../logic/actions/safe';

describe('useAsyncList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Success ────────────────────────────────────────────────────────────────

  it('fetches data on mount and returns items', async () => {
    const loader = vi.fn().mockResolvedValue({ ok: true, data: ['a', 'b', 'c'] } as DataResult<string[]>);
    const { result } = renderHook(() => useAsyncList({ loader }));

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);

    await act(async () => { await Promise.resolve(); });

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual(['a', 'b', 'c']);
    expect(result.current.error).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  // ─── Error ──────────────────────────────────────────────────────────────────

  it('sets error state on ok: false response', async () => {
    const loader = vi.fn().mockResolvedValue({ ok: false, error: 'UNAUTHORIZED' } as DataResult<number[]>);
    const { result } = renderHook(() => useAsyncList({ loader }));

    await act(async () => { await Promise.resolve(); });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('UNAUTHORIZED');
    expect(result.current.items).toEqual([]);
  });

  it('sets error state on rejected promise', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAsyncList({ loader }));

    await act(async () => { await Promise.resolve(); });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  // ─── Race cancellation ──────────────────────────────────────────────────────

  it('discards stale result when sourceKey changes mid-flight', async () => {
    let resolveFirst: (v: DataResult<string>) => void = () => {};
    const first = new Promise<DataResult<string>>((r) => { resolveFirst = r; });

    const loader = vi.fn()
      .mockReturnValueOnce(first)
      .mockResolvedValue({ ok: true, data: 'second' } as DataResult<string>);

    const { result, rerender } = renderHook(
      ({ sourceKey }) => useAsyncList({ loader, sourceKey }),
      { initialProps: { sourceKey: 'org-1' } },
    );

    expect(result.current.loading).toBe(true);

    // Change sourceKey before first resolves
    rerender({ sourceKey: 'org-2' });

    // Resolve stale first fetch
    await act(async () => {
      resolveFirst({ ok: true, data: 'stale' });
      await Promise.resolve();
    });

    // Stale result should be discarded; items should be from second fetch
    expect(result.current.items).toBe('second');
    expect(result.current.loading).toBe(false);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  // ─── Refresh strategy: refetch ──────────────────────────────────────────────

  it('refresh() triggers re-fetch with refetch strategy', async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: 1 } as DataResult<number>)
      .mockResolvedValueOnce({ ok: true, data: 2 } as DataResult<number>);

    const { result } = renderHook(() => useAsyncList({ loader, strategy: 'refetch' }));

    await act(async () => { await Promise.resolve(); });
    expect(result.current.items).toBe(1);

    act(() => { result.current.refresh(); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.items).toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
    // visible should always be true for refetch
    expect(result.current.visible).toBe(true);
  });

  // ─── Refresh strategy: remount ──────────────────────────────────────────────

  it('refresh() toggles visible and re-fetches with remount strategy', async () => {
    vi.useFakeTimers();
    const loader = vi.fn().mockResolvedValue({ ok: true, data: [1, 2] } as DataResult<number[]>);

    const { result } = renderHook(() => useAsyncList({ loader, strategy: 'remount' }));

    await act(async () => { await Promise.resolve(); });
    expect(loader).toHaveBeenCalledTimes(1);

    act(() => { result.current.refresh(); });
    expect(result.current.visible).toBe(false);

    act(() => { vi.advanceTimersByTime(35); });
    expect(result.current.visible).toBe(true);

    await act(async () => { await Promise.resolve(); });
    expect(loader).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('does not fetch when visible is false with remount strategy', async () => {
    vi.useFakeTimers();
    const loader = vi.fn().mockResolvedValue({ ok: true, data: [42] } as DataResult<number[]>);

    const { result } = renderHook(() => useAsyncList({ loader, strategy: 'remount' }));

    await act(async () => { await Promise.resolve(); });
    const callCount = loader.mock.calls.length;

    act(() => { result.current.refresh(); });
    // visible is now false
    await act(async () => { await Promise.resolve(); });
    expect(loader).toHaveBeenCalledTimes(callCount);

    vi.useRealTimers();
  });

  // ─── Enabled gating ─────────────────────────────────────────────────────────

  it('does not fetch when enabled is false', async () => {
    const loader = vi.fn().mockResolvedValue({ ok: true, data: [1] } as DataResult<number[]>);
    const { result } = renderHook(() => useAsyncList({ loader, enabled: false }));

    expect(result.current.loading).toBe(false);
    expect(loader).not.toHaveBeenCalled();
  });

  // ─── sourceKey change triggers re-fetch ─────────────────────────────────────

  it('re-fetches when sourceKey changes', async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: ['from-org-1'] } as DataResult<string[]>)
      .mockResolvedValueOnce({ ok: true, data: ['from-org-2'] } as DataResult<string[]>);

    const { result, rerender } = renderHook(
      ({ sourceKey }) => useAsyncList({ loader, sourceKey }),
      { initialProps: { sourceKey: 'org-1' } },
    );

    await act(async () => { await Promise.resolve(); });
    expect(result.current.items).toEqual(['from-org-1']);

    rerender({ sourceKey: 'org-2' });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.items).toEqual(['from-org-2']);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  // ─── Keeps previous items while loading ─────────────────────────────────────

  it('keeps previous items while loading new data', async () => {
    let resolveSecond: (v: DataResult<string[]>) => void = () => {};
    const second = new Promise<DataResult<string[]>>((r) => { resolveSecond = r; });

    const loader = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: ['old'] } as DataResult<string[]>)
      .mockReturnValueOnce(second);

    const { result, rerender } = renderHook(
      ({ sourceKey }) => useAsyncList({ loader, sourceKey }),
      { initialProps: { sourceKey: 'org-1' } },
    );

    await act(async () => { await Promise.resolve(); });
    expect(result.current.items).toEqual(['old']);

    rerender({ sourceKey: 'org-2' });

    // Loading: should still show old items
    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual(['old']);

    await act(async () => {
      resolveSecond({ ok: true, data: ['new'] });
      await Promise.resolve();
    });

    expect(result.current.items).toEqual(['new']);
  });

  // ─── initialData seeding (instant-fetch / streaming) ───────────────────────

  it('seeds items from initialData and skips the mount fetch', async () => {
    const loader = vi.fn().mockResolvedValue({ ok: true, data: ['fresh'] } as DataResult<string[]>);
    const { result } = renderHook(() =>
      useAsyncList<string[]>({ loader, initialData: ['seeded'] }),
    );

    // items are seeded synchronously on first render.
    expect(result.current.items).toEqual(['seeded']);
    // loading is false because initialData was provided.
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    // Flush any pending microtasks — the effect should NOT have called the loader.
    await act(async () => { await Promise.resolve(); });
    expect(loader).not.toHaveBeenCalled();
  });

  it('treats empty array initialData as "user has zero items" and skips the fetch', async () => {
    // Distinguishes "no streamed promise yet" (undefined) from "server
    // confirmed zero roles" ([]). The latter must not trigger a refetch.
    const loader = vi.fn().mockResolvedValue({ ok: true, data: ['should-not-be-used'] } as DataResult<string[]>);
    const { result } = renderHook(() =>
      useAsyncList<string[]>({ loader, initialData: [] }),
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);

    await act(async () => { await Promise.resolve(); });
    expect(loader).not.toHaveBeenCalled();
  });

  it('starts loading when initialData is undefined (legacy behavior)', async () => {
    const loader = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAsyncList<string[]>({ loader }));

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  it('refresh() still fetches after initialData seeded the state', async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: ['refreshed'] } as DataResult<string[]>);

    const { result } = renderHook(() =>
      useAsyncList<string[]>({ loader, strategy: 'refetch', initialData: ['seeded'] }),
    );

    // No fetch on mount.
    await act(async () => { await Promise.resolve(); });
    expect(loader).not.toHaveBeenCalled();

    // refresh() bypasses the initialData skip.
    act(() => { result.current.refresh(); });
    await act(async () => { await Promise.resolve(); });

    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.current.items).toEqual(['refreshed']);
  });

  it('re-fetches on sourceKey change even when initialData was provided', async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: ['from-org-2'] } as DataResult<string[]>);

    const { result, rerender } = renderHook(
      ({ sourceKey }) => useAsyncList<string[]>({ loader, sourceKey, initialData: ['seeded'] }),
      { initialProps: { sourceKey: 'org-1' } },
    );

    // Mount: seeded, no fetch.
    await act(async () => { await Promise.resolve(); });
    expect(loader).not.toHaveBeenCalled();
    expect(result.current.items).toEqual(['seeded']);

    // Switch org → sourceKey change → fetch fires.
    rerender({ sourceKey: 'org-2' });
    await act(async () => { await Promise.resolve(); });

    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.current.items).toEqual(['from-org-2']);
  });

  it('respects enabled:false even when initialData is provided', async () => {
    const loader = vi.fn().mockResolvedValue({ ok: true, data: ['x'] } as DataResult<string[]>);
    const { result } = renderHook(() =>
      useAsyncList<string[]>({ loader, enabled: false, initialData: ['seeded'] }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual(['seeded']);

    await act(async () => { await Promise.resolve(); });
    expect(loader).not.toHaveBeenCalled();
  });

  // ─── BUG-075: initialData + enabled starts false → enabled becomes true ────

  it('fetches when enabled transitions from false to true even with initialData (BUG-075)', async () => {
    const loader = vi.fn().mockResolvedValue({ ok: true, data: ['fresh'] } as DataResult<string[]>);
    const { result, rerender } = renderHook(
      ({ enabled }) => useAsyncList<string[]>({ loader, enabled, initialData: ['seeded'] }),
      { initialProps: { enabled: false } },
    );

    // initialData seeds the state; no fetch while disabled.
    expect(result.current.items).toEqual(['seeded']);
    expect(result.current.loading).toBe(false);
    await act(async () => { await Promise.resolve(); });
    expect(loader).not.toHaveBeenCalled();

    // Enable → should trigger the first fetch, not be blocked by the
    // hasInitialDataRef flag that was never consumed during the inactive run.
    rerender({ enabled: true });
    expect(result.current.loading).toBe(true);

    await act(async () => { await Promise.resolve(); });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.current.items).toEqual(['fresh']);
    expect(result.current.loading).toBe(false);
  });
});
