'use client';

import { useState, useCallback } from 'react';
import { fetchGeo, getCachedGeo, clearGeoCache } from '../../logic/geo-cache';
import type { GeoLocation } from '../../logic/geo-cache';

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

  const locate = useCallback(
    async (ip: string): Promise<void> => {
      if (!ip) return;

      // Check cache first — no network request needed
      const cached = getCachedGeo(ip);
      if (cached) {
        setMapModalGeo(cached);
        setMapModalIp(ip);
        return;
      }

      setLocatingIp(ip);
      try {
        const geo = await fetchGeo(ip);
        setLocatingIp(null);
        if (geo) {
          setMapModalGeo(geo);
          setMapModalIp(ip);
        }
        // Silently no-op when fetchGeo returns null (private IP, rate-limited, etc.)
      } catch (err) {
        setLocatingIp(null);
        const message =
          err instanceof Error ? err.message : 'Geolocation lookup failed';
        onError?.(message);
      }
    },
    [onError],
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
