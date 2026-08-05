import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchGeo, clearGeoCache } from './geo-cache';

// Mock window.sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock fetch
const fetchMock = vi.fn();

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, 'fetch', {
  value: fetchMock,
  writable: true,
});

describe('fetchGeo', () => {
  beforeEach(() => {
    clearGeoCache();
    sessionStorageMock.getItem.mockReset();
    sessionStorageMock.setItem.mockReset();
    fetchMock.mockReset();
  });

  it('makes API call with valid public IP', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 41.0082,
        longitude: 28.9784,
        city: 'Istanbul',
        country_name: 'Turkey',
        region: 'Istanbul',
      }),
    });
    
    const result = await fetchGeo('8.8.8.8');
    
    // The call now includes a signal option (timeout) - use objectContaining
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ipapi.co/8.8.8.8/json/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).not.toBeNull();
    expect(result?.lat).toBe(41.0082);
  });

  it('returns null for empty IP', async () => {
    const result = await fetchGeo('');
    
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // LOGIC-BUG-001: IP validation guard tests
  it('returns null and does not fetch for invalid IP (path traversal attempt)', async () => {
    
    const result = await fetchGeo('../etc/passwd');
    
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null and does not fetch for hostname (SSRF attempt)', async () => {
    
    const result = await fetchGeo('internal.example.com');
    
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks private IPv4 address (192.168.x.x) — does not forward to external geo API', async () => {
    const result = await fetchGeo('192.168.0.1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks loopback IPv6 address (::1) — does not forward to external geo API', async () => {
    const result = await fetchGeo('::1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid IPv6 address containing triple colons (::: )', async () => {
    const result = await fetchGeo(':::');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid IPv4 address containing leading zeros', async () => {
    const result = await fetchGeo('192.168.01.1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // BUG-M-003: Additional private/loopback IP block tests
  it('blocks loopback IPv4 (127.0.0.1)', async () => {
    const result = await fetchGeo('127.0.0.1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['::ffff:7f00:1', '127.0.0.1'],
    ['::ffff:0a00:1', '10.0.0.1'],
    ['::ffff:ac10:1', '172.16.0.1'],
    ['::ffff:a9fe:1', '169.254.0.1'],
    ['::ffff:6440:1', '100.64.0.1'],
  ])('blocks hexadecimal IPv4-mapped private address %s (%s)', async (mappedIp) => {
    const result = await fetchGeo(mappedIp);
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks 10.x.x.x (RFC-1918)', async () => {
    const result = await fetchGeo('10.0.0.1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks 172.16.x.x (RFC-1918)', async () => {
    const result = await fetchGeo('172.16.0.1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks link-local 169.254.x.x', async () => {
    const result = await fetchGeo('169.254.1.1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still allows public IPs like 8.8.8.8', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 37.386,
        longitude: -122.0838,
        city: 'Mountain View',
        country_name: 'United States',
        region: 'California',
      }),
    });
    const result = await fetchGeo('8.8.8.8');
    expect(fetchMock).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  // BUG-014: Additional private/loopback IP block tests
  it('blocks IPv6 unspecified (::)', async () => {
    const result = await fetchGeo('::');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks IPv4 unspecified (0.0.0.0)', async () => {
    const result = await fetchGeo('0.0.0.0');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks IPv6 ULA fd00::1 (fc00::/7)', async () => {
    const result = await fetchGeo('fd00::1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks CGNAT 100.64.0.0/10 (100.64.0.1)', async () => {
    const result = await fetchGeo('100.64.0.1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks CGNAT 100.127.255.254 (upper bound of 100.64.0.0/10)', async () => {
    const result = await fetchGeo('100.127.255.254');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not block public IP 100.63.0.1 (below CGNAT range)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 1.0,
        longitude: 1.0,
        city: '',
        country_name: '',
        region: '',
      }),
    });
    const result = await fetchGeo('100.63.0.1');
    expect(fetchMock).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it('does not block public IP 100.128.0.1 (above CGNAT range)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 1.0,
        longitude: 1.0,
        city: '',
        country_name: '',
        region: '',
      }),
    });
    const result = await fetchGeo('100.128.0.1');
    expect(fetchMock).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  // BUG-071: Non-canonical IPv6 addresses should be accepted
  it('accepts valid non-canonical IPv6 with leading zeros (2001:0db8::1)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 51.5074,
        longitude: -0.1278,
        city: 'London',
        country_name: 'United Kingdom',
        region: 'England',
      }),
    });
    const result = await fetchGeo('2001:0db8::1');
    expect(fetchMock).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it('accepts valid non-canonical IPv6 with multiple leading-zero segments', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 35.6895,
        longitude: 139.6917,
        city: 'Tokyo',
        country_name: 'Japan',
        region: 'Tokyo',
      }),
    });
    const result = await fetchGeo('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    expect(fetchMock).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });
});
