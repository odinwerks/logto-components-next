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

      // Set consent before calling fetchGeo (which checks consent)
      // NOTE: Geo-consent is stored in sessionStorage for the current browser session only.
      // It controls whether the user's browser makes requests to ipapi.co.
      // For government deployments requiring strict consent tracking, consider:
      //   1. Disabling the geo-lookup feature entirely (remove 'sessions' tab geo button), or
      //   2. Persisting consent to customData via a dedicated server-side consent action.
      // sessionStorage can be forged by code with JS execution in the user's browser context,
      // which is acceptable here because the only consequence is an external API call FROM
      // the user's own browser — not a server-side data leak.
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
