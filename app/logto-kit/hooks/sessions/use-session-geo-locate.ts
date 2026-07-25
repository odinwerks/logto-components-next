'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchGeo, getCachedGeo, clearGeoCache } from '../../logic/geo-cache';
import type { GeoLocation } from '../../logic/geo-cache';
import { useAsyncGuard } from '../use-async-guard';

export interface UseSessionGeoLocateOptions {
  onError?: (message: string) => void;
}

export interface UseSessionGeoLocateResult {
  locatingIp: string | null;
  mapModalGeo: GeoLocation | null;
  mapModalIp: string;
  locate: (ip: string) => Promise<void>;
  closeMapModal: () => void;
  clearCache: () => void;
}

export function useSessionGeoLocate({
  onError,
}: UseSessionGeoLocateOptions = {}): UseSessionGeoLocateResult {
  const [locatingIp, setLocatingIp] = useState<string | null>(null);
  const [mapModalGeo, setMapModalGeo] = useState<GeoLocation | null>(null);
  const [mapModalIp, setMapModalIp] = useState<string>('');

  const guard = useAsyncGuard();
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Track mount state and cancel in-flight fetches on unmount.
    // guard.bump is a stable useCallback — no need for [guard] deps.
    // Including [guard] would cause the effect to re-run on every render
    // (useAsyncGuard returns a new object each time), which bumps the
    // generation counter and makes all in-flight locate calls go stale.
    return () => {
      isMountedRef.current = false;
      guard.bump();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locate = useCallback(
    async (ip: string): Promise<void> => {
      if (!ip) return;

      // Check cache first — no network request needed
      const cached = getCachedGeo(ip);
      if (cached) {
        if (!isMountedRef.current) return;
        setMapModalGeo(cached);
        setMapModalIp(ip);
        return;
      }

      const gen = guard.capture();
      if (!isMountedRef.current) return;
      setLocatingIp(ip);
      try {
        const geo = await fetchGeo(ip);
        if (guard.isStale(gen)) return;
        if (!isMountedRef.current) return;
        setLocatingIp(null);
        if (geo) {
          setMapModalGeo(geo);
          setMapModalIp(ip);
        }
        // Silently no-op when fetchGeo returns null (private IP, rate-limited, etc.)
      } catch (err) {
        if (guard.isStale(gen)) return;
        if (!isMountedRef.current) return;
        setLocatingIp(null);
        const message =
          err instanceof Error ? err.message : 'Geolocation lookup failed';
        onError?.(message);
      }
    },
    [onError, guard],
  );

  const closeMapModal = useCallback(() => {
    setMapModalGeo(null);
    setMapModalIp('');
  }, []);

  const clearCache = useCallback(() => {
    clearGeoCache();
  }, []);

  return {
    locatingIp,
    mapModalGeo,
    mapModalIp,
    locate,
    closeMapModal,
    clearCache,
  };
}
