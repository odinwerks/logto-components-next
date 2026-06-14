import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchGeo, getCachedGeo, setCachedGeo, clearGeoCache } from './geo-cache';

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

  it('returns null when no consent is given', async () => {
    sessionStorageMock.getItem.mockReturnValue(null);
    
    const result = await fetchGeo('8.8.8.8');
    
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when consent is not "true"', async () => {
    sessionStorageMock.getItem.mockReturnValue('false');
    
    const result = await fetchGeo('8.8.8.8');
    
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes API call when consent is "true"', async () => {
    sessionStorageMock.getItem.mockReturnValue('true');
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

  it('returns null even with cached data when consent is not given', async () => {
    // Set consent to false
    sessionStorageMock.getItem.mockReturnValue(null);
    
    // Manually populate cache
    setCachedGeo('1.1.1.1', {
      lat: -33.8688,
      lon: 151.2093,
      city: 'Sydney',
      country: 'Australia',
      region: 'New South Wales',
    });
    
    // getCachedGeo should still work (used by other code paths)
    const cached = getCachedGeo('1.1.1.1');
    expect(cached).not.toBeNull();
    expect(cached?.city).toBe('Sydney');
    
    // fetchGeo should return null due to consent check (even with cached data)
    const result = await fetchGeo('1.1.1.1');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null for empty IP', async () => {
    sessionStorageMock.getItem.mockReturnValue('true');
    
    const result = await fetchGeo('');
    
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // LOGIC-BUG-001: IP validation guard tests
  it('returns null and does not fetch for invalid IP (path traversal attempt)', async () => {
    sessionStorageMock.getItem.mockReturnValue('true');
    
    const result = await fetchGeo('../etc/passwd');
    
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null and does not fetch for hostname (SSRF attempt)', async () => {
    sessionStorageMock.getItem.mockReturnValue('true');
    
    const result = await fetchGeo('internal.example.com');
    
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts valid IPv4 address', async () => {
    sessionStorageMock.getItem.mockReturnValue('true');
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 1.0,
        longitude: 2.0,
        city: 'Test',
        country_name: 'Testland',
        region: 'Test Region',
      }),
    });
    
    const result = await fetchGeo('192.168.0.1');
    
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ipapi.co/192.168.0.1/json/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).not.toBeNull();
  });

  it('accepts valid IPv6 address (::1)', async () => {
    sessionStorageMock.getItem.mockReturnValue('true');
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        latitude: 1.0,
        longitude: 2.0,
        city: 'Local',
        country_name: 'Local',
        region: 'Local',
      }),
    });
    
    const result = await fetchGeo('::1');
    
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ipapi.co/::1/json/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).not.toBeNull();
  });
});
