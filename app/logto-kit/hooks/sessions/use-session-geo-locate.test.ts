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

  it('4. grants consent: sessionStorage geo-consent set to true, hasConsent becomes true', async () => {
    mockGetCachedGeo.mockReturnValue(null);
    mockFetchGeo.mockResolvedValue(null);

    const { result } = renderHook(() => useSessionGeoLocate({}));

    expect(result.current.hasConsent).toBe(false);

    await act(async () => {
      await result.current.locate('1.2.3.4');
    });

    expect(result.current.hasConsent).toBe(true);
    expect(window.sessionStorage.getItem('geo-consent')).toBe('true');
  });

  it('5. closeMapModal: resets mapModalGeo and mapModalIp', async () => {
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

  it('7. hasConsent initialization from sessionStorage', () => {
    window.sessionStorage.setItem('geo-consent', 'true');

    const { result } = renderHook(() => useSessionGeoLocate({}));

    expect(result.current.hasConsent).toBe(true);
  });

  it('8. empty string ip: no-op, nothing happens', async () => {
    const { result } = renderHook(() => useSessionGeoLocate({}));

    await act(async () => {
      await result.current.locate('');
    });

    expect(mockGetCachedGeo).not.toHaveBeenCalled();
    expect(mockFetchGeo).not.toHaveBeenCalled();
    expect(result.current.mapModalGeo).toBeNull();
    expect(result.current.locatingIp).toBeNull();
  });
});
