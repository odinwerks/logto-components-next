import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionGeoLocate } from './use-session-geo-locate';

vi.mock('../../logic/geo-cache', () => ({
  fetchGeo: vi.fn(),
  getCachedGeo: vi.fn(),
  clearGeoCache: vi.fn(),
}));

import { fetchGeo, getCachedGeo, clearGeoCache } from '../../logic/geo-cache';

const mockFetchGeo = vi.mocked(fetchGeo);
const mockGetCachedGeo = vi.mocked(getCachedGeo);
const mockClearGeoCache = vi.mocked(clearGeoCache);

const GEO_RESULT = { lat: 51.5, lon: -0.1, city: 'London', country: 'UK', region: 'England' };

describe('useSessionGeoLocate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage between tests
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
    }
    mockGetCachedGeo.mockReturnValue(null);
    mockFetchGeo.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. cache hit: mapModalGeo set immediately, locatingIp never set', async () => {
    mockGetCachedGeo.mockReturnValue(GEO_RESULT);

    const { result } = renderHook(() => useSessionGeoLocate({}));

    await act(async () => {
      await result.current.locate('1.2.3.4');
    });

    expect(result.current.mapModalGeo).toEqual(GEO_RESULT);
    expect(result.current.mapModalIp).toBe('1.2.3.4');
    expect(result.current.locatingIp).toBeNull();
    expect(mockFetchGeo).not.toHaveBeenCalled();
  });

  it('2. cache miss: locatingIp set during fetch, cleared after', async () => {
    let resolveFetch!: (value: typeof GEO_RESULT) => void;
    const fetchPromise = new Promise<typeof GEO_RESULT>((resolve) => {
      resolveFetch = resolve;
    });
    mockGetCachedGeo.mockReturnValue(null);
    mockFetchGeo.mockReturnValue(fetchPromise);

    const { result } = renderHook(() => useSessionGeoLocate({}));

    let locatePromise!: Promise<void>;
    act(() => {
      locatePromise = result.current.locate('1.2.3.4');
    });

    // locatingIp should be set now
    expect(result.current.locatingIp).toBe('1.2.3.4');

    await act(async () => {
      resolveFetch(GEO_RESULT);
      await locatePromise;
    });

    expect(result.current.locatingIp).toBeNull();
    expect(result.current.mapModalGeo).toEqual(GEO_RESULT);
    expect(result.current.mapModalIp).toBe('1.2.3.4');
  });

  it('3. fetchGeo returns null: silent no-op, mapModalGeo remains null', async () => {
    mockGetCachedGeo.mockReturnValue(null);
    mockFetchGeo.mockResolvedValue(null);

    const onError = vi.fn();
    const { result } = renderHook(() => useSessionGeoLocate({ onError }));

    await act(async () => {
      await result.current.locate('1.2.3.4');
    });

    expect(result.current.mapModalGeo).toBeNull();
    expect(result.current.locatingIp).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('4. closeMapModal: resets mapModalGeo and mapModalIp', async () => {
    mockGetCachedGeo.mockReturnValue(GEO_RESULT);

    const { result } = renderHook(() => useSessionGeoLocate({}));

    await act(async () => {
      await result.current.locate('1.2.3.4');
    });
    expect(result.current.mapModalGeo).toEqual(GEO_RESULT);

    act(() => {
      result.current.closeMapModal();
    });

    expect(result.current.mapModalGeo).toBeNull();
    expect(result.current.mapModalIp).toBe('');
  });

  it('6. clearCache: calls clearGeoCache', () => {
    const { result } = renderHook(() => useSessionGeoLocate({}));

    act(() => {
      result.current.clearCache();
    });

    expect(mockClearGeoCache).toHaveBeenCalledTimes(1);
  });

  it('7. empty string ip: no-op, nothing happens', async () => {
    const { result } = renderHook(() => useSessionGeoLocate({}));

    await act(async () => {
      await result.current.locate('');
    });

    expect(mockGetCachedGeo).not.toHaveBeenCalled();
    expect(mockFetchGeo).not.toHaveBeenCalled();
    expect(result.current.mapModalGeo).toBeNull();
    expect(result.current.locatingIp).toBeNull();
  });

  // ─── BUG-029: async guard + unmount safety ──────────────────────────────────

  it('BUG-029: stale response discarded — IP-B resolves first, IP-A resolves later', async () => {
    // Two IPs race: IP-A fires first but resolves second (slower response).
    // The hook must discard IP-A's stale result and preserve IP-B's result.
    const GEO_A = { ...GEO_RESULT, city: 'City-A' };
    const GEO_B = { ...GEO_RESULT, city: 'City-B' };

    let resolveA!: (v: { lat: number; lon: number; city: string; country: string; region: string }) => void;
    let resolveB!: (v: { lat: number; lon: number; city: string; country: string; region: string }) => void;
    const promiseA = new Promise<typeof GEO_A>((resolve) => { resolveA = resolve; });
    const promiseB = new Promise<typeof GEO_B>((resolve) => { resolveB = resolve; });

    mockGetCachedGeo.mockReturnValue(null);
    mockFetchGeo
      .mockReturnValueOnce(promiseA) // IP-A → resolves second (slow)
      .mockReturnValueOnce(promiseB); // IP-B → resolves first (fast)

    const { result } = renderHook(() => useSessionGeoLocate({}));

    // Start IP-A (slow)
    let locateAPromise!: Promise<void>;
    act(() => {
      locateAPromise = result.current.locate('1.1.1.1');
    });
    expect(result.current.locatingIp).toBe('1.1.1.1');

    // Start IP-B (fast) — bumps generation, should supersede IP-A
    let locateBPromise!: Promise<void>;
    act(() => {
      locateBPromise = result.current.locate('2.2.2.2');
    });
    expect(result.current.locatingIp).toBe('2.2.2.2');

    // IP-B resolves first
    await act(async () => {
      resolveB(GEO_B);
      await locateBPromise;
    });
    expect(result.current.locatingIp).toBeNull();
    expect(result.current.mapModalGeo).toEqual(GEO_B);
    expect(result.current.mapModalIp).toBe('2.2.2.2');

    // IP-A resolves later — MUST be discarded (stale generation)
    await act(async () => {
      resolveA(GEO_A);
      await locateAPromise;
    });

    // Modal should STILL show IP-B, NOT IP-A
    expect(result.current.mapModalGeo).toEqual(GEO_B);
    expect(result.current.mapModalIp).toBe('2.2.2.2');
    expect(result.current.locatingIp).toBeNull(); // IP-A's locatingIp was already cleared by race
  });

  it('BUG-029: stale error discarded when error comes from outdated generation', async () => {
    // When a stale fetch errors, the error should NOT be reported
    let resolveSlow!: (v: { lat: number; lon: number; city: string; country: string; region: string }) => void;
    let rejectSlow!: (e: Error) => void;
    const slowPromise = new Promise<typeof GEO_RESULT>((resolve, reject) => {
      resolveSlow = resolve;
      rejectSlow = reject;
    });

    mockGetCachedGeo.mockReturnValue(null);
    mockFetchGeo
      .mockReturnValueOnce(slowPromise) // slow fetch (will error after being superseded)
      .mockResolvedValue(GEO_RESULT);   // fast fetch (supersedes)

    const onError = vi.fn();
    const { result } = renderHook(() => useSessionGeoLocate({ onError }));

    // Start slow fetch
    act(() => {
      result.current.locate('1.1.1.1');
    });

    // Start fast fetch — supersedes slow one
    await act(async () => {
      await result.current.locate('2.2.2.2');
    });
    expect(result.current.mapModalGeo).toEqual(GEO_RESULT);

    // Now the slow (stale) fetch errors
    await act(async () => {
      rejectSlow(new Error('stale error'));
      // We need to settle the rejected promise. Use a catch to prevent unhandled rejection
      await slowPromise.catch(() => {});
    });

    // Error from stale generation should NOT fire onError
    expect(onError).not.toHaveBeenCalled();
    // Modal should still show the fast fetch result
    expect(result.current.mapModalGeo).toEqual(GEO_RESULT);
  });

  it('BUG-029: setState does not fire on unmounted component', async () => {
    // After unmount, finishing a fetch should not call setState
    let resolveFetch!: (v: { lat: number; lon: number; city: string; country: string; region: string }) => void;
    const fetchPromise = new Promise<typeof GEO_RESULT>((resolve) => {
      resolveFetch = resolve;
    });

    mockGetCachedGeo.mockReturnValue(null);
    mockFetchGeo.mockReturnValue(fetchPromise);

    const { result, unmount } = renderHook(() => useSessionGeoLocate({}));

    // Start a fetch
    let locatePromise!: Promise<void>;
    act(() => {
      locatePromise = result.current.locate('1.1.1.1');
    });
    expect(result.current.locatingIp).toBe('1.1.1.1');

    // Unmount while fetch is in-flight
    unmount();

    // Resolve the fetch — should not throw "state update on unmounted component"
    // (React 18 suppresses these in tests, but the guard prevents the setState call entirely)
    await act(async () => {
      resolveFetch(GEO_RESULT);
    });

    // locatePromise should complete without error (stale result is silently discarded)
    await expect(locatePromise).resolves.toBeUndefined();

    // mapModalGeo should remain at whatever it was before unmount (null in this case)
    // Note: after unmount, reading result.current is not meaningful in RTL
  });
});
