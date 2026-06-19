'use client';

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
  if (typeof window === 'undefined') return null;
  const entry = cache.get(ip);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL) {
    cache.delete(ip);
    return null;
  }
  return entry.geo;
}

export function setCachedGeo(ip: string, geo: GeoLocation): void {
  if (typeof window === 'undefined') return;
  cache.set(ip, { geo, fetchedAt: Date.now() });
}

export function clearGeoCache(): void {
  if (typeof window === 'undefined') return;
  cache.clear();
}

// IPv4 regex: four decimal octets (0-255) with leading zeros disallowed
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/;
// IPv6 regex: simplified validation (covers full notation and common compressed forms)
const IPV6_REGEX = /^(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

/**
 * Returns true if `ip` is a valid IPv4 or IPv6 address.
 * Prevents SSRF / path-traversal via URL interpolation (LOGIC-BUG-001).
 */
function isValidIp(ip: string): boolean {
  if (IPV4_REGEX.test(ip)) {
    return true;
  }
  if (!IPV6_REGEX.test(ip)) {
    return false;
  }
  try {
    const url = new URL(`http://[${ip}]`);
    return url.hostname === `[${ip.toLowerCase()}]`;
  } catch {
    return false;
  }
}

const inFlight = new Map<string, Promise<GeoLocation | null>>();

/**
 * Well-known cloud infrastructure / metadata IPs that must never be sent to
 * external geolocation APIs. These are internal infrastructure endpoints:
 *   - 169.254.169.254: AWS, GCP, Azure Instance Metadata Service (IMDS)
 *   - 100.100.100.200: Alibaba Cloud IMDS
 *   - 192.0.0.192: RFC 7526 NAT64 well-known prefix
 * Blocking these prevents a user from triggering lookups for infrastructure IPs.
 */
const BLOCKED_GEO_IPS = new Set([
  '169.254.169.254', // AWS/GCP/Azure IMDS
  '100.100.100.200', // Alibaba Cloud IMDS
  '192.0.0.192',     // RFC 7526 NAT64
]);

/**
 * Returns true for RFC-1918 private, loopback, and link-local addresses.
 * These must never be forwarded to an external geolocation API.
 */
function isPrivateOrLoopbackIp(ip: string): boolean {
  // IPv4 loopback
  if (ip === '127.0.0.1' || ip.startsWith('127.')) return true;
  // IPv6 loopback
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
  // RFC-1918: 10.0.0.0/8
  if (ip.startsWith('10.')) return true;
  // RFC-1918: 172.16.0.0/12 (172.16.x.x – 172.31.x.x)
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  // RFC-1918: 192.168.0.0/16
  if (ip.startsWith('192.168.')) return true;
  // Link-local: 169.254.0.0/16 (also includes IMDS 169.254.169.254 already in BLOCKED_GEO_IPS)
  if (ip.startsWith('169.254.')) return true;
  // IPv6 link-local: fe80::/10
  if (/^fe[89ab]/i.test(ip)) return true;
  return false;
}

export async function fetchGeo(ip: string): Promise<GeoLocation | null> {
  if (typeof window === 'undefined') return null;
  if (!ip) return null;

  // Validate IP format before interpolating into the URL (SSRF / path-traversal guard)
  if (!isValidIp(ip)) return null;

  // Block cloud metadata / infrastructure IPs from being sent to external geo APIs
  if (BLOCKED_GEO_IPS.has(ip)) return null;

  // Block private/loopback IPs: do not send internal addresses to external geo API
  if (isPrivateOrLoopbackIp(ip)) return null;

  // Check user consent before geolocation lookup
  const consent = sessionStorage.getItem('geo-consent');
  if (consent !== 'true') {
    return null; // No consent, skip geolocation
  }

  const cached = getCachedGeo(ip);
  if (cached) return cached;

  if (inFlight.has(ip)) return inFlight.get(ip)!;

  const promise = (async () => {
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(5000), // 5-second timeout (LOGIC-BUG-001)
      });
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