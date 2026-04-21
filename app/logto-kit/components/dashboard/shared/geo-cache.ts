export interface GeoLocation {
  lat: number;
  lon: number;
  city: string;
  country: string;
  region: string;
}

interface CacheEntry {
  geo: GeoLocation;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000;

export function getCachedGeo(ip: string): GeoLocation | null {
  const entry = cache.get(ip);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL) {
    cache.delete(ip);
    return null;
  }
  return entry.geo;
}

export function setCachedGeo(ip: string, geo: GeoLocation): void {
  cache.set(ip, { geo, fetchedAt: Date.now() });
}

export function clearGeoCache(): void {
  cache.clear();
}

const inFlight = new Map<string, Promise<GeoLocation | null>>();

export async function fetchGeo(ip: string): Promise<GeoLocation | null> {
  if (!ip) return null;

  const cached = getCachedGeo(ip);
  if (cached) return cached;

  if (inFlight.has(ip)) return inFlight.get(ip)!;

  const promise = (async () => {
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.error) return null;
      const geo: GeoLocation = {
        lat: data.latitude,
        lon: data.longitude,
        city: data.city || '',
        country: data.country_name || '',
        region: data.region || '',
      };
      if (typeof geo.lat !== 'number' || typeof geo.lon !== 'number') return null;
      setCachedGeo(ip, geo);
      return geo;
    } catch {
      return null;
    } finally {
      inFlight.delete(ip);
    }
  })();

  inFlight.set(ip, promise);
  return promise;
}