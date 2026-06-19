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
  hasConsent: boolean;
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
  const [hasConsent, setHasConsent] = useState<boolean>(
    typeof window !== 'undefined' ? sessionStorage.getItem('geo-consent') === 'true' : false,
  );

  const locate = useCallback(
    async (ip: string): Promise<void> => {
      if (!ip) return;

      // INTENTIONAL: consent is recorded immediately when the user actively clicks "Locate"
      // (the locate action IS the consent gesture). The lookup itself is cheap/fast, so
      // deferring consent until after the network call would add unnecessary latency while
      // providing no meaningful UX benefit. The consent flag persists for the browser
      // session only (sessionStorage), not cross-session.
      // NOTE: For deployments requiring explicit separate consent (e.g. government/regulated
      // environments), consider adding a confirmation dialog before calling locate(), or
      // disable the geo feature entirely by removing the geo button from the Sessions tab.
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('geo-consent', 'true');
      }
      setHasConsent(true);

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
    hasConsent,
    locate,
    closeMapModal,
    clearCache,
  };
}
