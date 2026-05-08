import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GeoLocation } from './geo-cache';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

// Mock maplibre-gl - it doesn't work in jsdom
// Use class-based mocks (vitest 4.x requires function/class for constructors)
vi.mock('maplibre-gl', () => {
  const MockMap = vi.fn().mockImplementation(function (this: { remove: ReturnType<typeof vi.fn> }) {
    this.remove = vi.fn();
  });

  const MockMarker = vi.fn().mockImplementation(function (this: { setLngLat: ReturnType<typeof vi.fn>; addTo: ReturnType<typeof vi.fn> }) {
    this.setLngLat = vi.fn().mockReturnThis();
    this.addTo = vi.fn().mockReturnThis();
  });

  return {
    default: {
      Map: MockMap,
      Marker: MockMarker,
    },
  };
});

// Mock maplibre-gl CSS import
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

// Import after mocks
import { SessionMapModal } from './SessionMapModal';

// Duplicate city/region — deduplication should collapse these
const mockGeo: GeoLocation = {
  lat: 41.7151,
  lon: 44.8271,
  city: 'Tbilisi',
  region: 'Tbilisi',
  country: 'Georgia',
};

// All-distinct values — nothing should be deduplicated
const mockGeoUnique: GeoLocation = {
  lat: 39.7447,
  lon: -75.5484,
  city: 'Wilmington',
  region: 'Delaware',
  country: 'US',
};

const mockColors: ThemeColors = {
  bgPage: '#f9fafb',
  bgPrimary: '#ffffff',
  bgSecondary: '#f3f4f6',
  bgTertiary: '#e5e7eb',
  textPrimary: '#1a1a1a',
  textSecondary: '#374151',
  textTertiary: '#666666',
  borderColor: '#e0e0e0',
  accentGreen: '#10b981',
  accentRed: '#cc0000',
  accentYellow: '#f59e0b',
  accentBlue: '#0066cc',
  successBg: '#d1fae5',
  errorBg: '#fef2f2',
  warningBg: '#fef3c7',
  contrastText: '#fff',
  fontWeight: 500,
};

const mockDarkColors: ThemeColors = {
  ...mockColors,
  bgPage: '#050505',
  bgPrimary: '#0a0a0a',
  bgSecondary: '#111111',
  bgTertiary: '#1a1a1a',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  borderColor: '#333333',
  accentRed: '#ef4444',
  errorBg: '#450a0a',
  fontWeight: 400,
};

const mockTranslations: Translations = {
  sessions: {
    title: 'Sessions',
    description: 'Devices and browsers',
    activeSessions: 'Active sessions',
    currentSession: 'Current session',
    loggedInAt: 'Logged on',
    lastActive: 'Last active',
    expires: 'Expires',
    authMethod: 'Authentication',
    deviceId: 'Session ID',
    browser: 'Browser',
    os: 'Operating system',
    device: 'Device',
    ip: 'IP address',
    unknown: 'Unknown',
    revoke: 'Revoke',
    revokeSession: 'Revoke session',
    revokeSessionDesc: 'Enter password',
    processing: 'Processing...',
    revokeAll: 'Revoke all',
    revokeAllDesc: 'Sign out of all',
    revoked: 'Session revoked',
    revokeFailed: 'Failed',
    noSessions: 'No active sessions',
    password: 'Password',
    social: 'Social login',
    enterpriseSso: 'Enterprise SSO',
    webauthn: 'Passkey',
    totp: 'TOTP',
    backupCode: 'Backup code',
    desktop: 'Desktop',
    tablet: 'Tablet',
    mobile: 'Mobile',
    thisDevice: 'This device',
    verifyToView: 'Verify',
    verifyToViewDesc: 'Enter password',
    verifyPassword: 'Verify password',
    verifyFailed: 'Failed',
    loadFailed: 'Failed to load',
    locationUnavailable: 'Location unavailable',
    ipLocation: 'IP Location',
    viewOnOpenStreetMap: 'View on OpenStreetMap',
    viewOnGoogleMaps: 'View on Google Maps',
    refreshData: 'Refresh',
    satellite: 'Satellite',
    street: 'Street',
    activeNow: 'Active now',
  },
} as Translations;

describe('SessionMapModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should render the map div container', () => {
    const { container } = render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="light"
        colors={mockColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    // The map container div is rendered (maplibre-gl mounts into it)
    expect(container.querySelector('div[style*="420px"]')).toBeDefined();
  });

  it('should show deduplicated location label when city and region match', () => {
    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="light"
        colors={mockColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    // city === region ('Tbilisi'), so Set deduplicates — country survives
    expect(screen.getByText('Tbilisi, Georgia')).toBeDefined();
  });

  it('should show full location label when all fields are distinct', () => {
    render(
      <SessionMapModal
        geo={mockGeoUnique}
        ip="192.168.1.1"
        mode="light"
        colors={mockColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    // All distinct — nothing deduplicated
    expect(screen.getByText('Wilmington, Delaware, US')).toBeDefined();
  });

  it('should have link to OpenStreetMap (not Google Maps)', () => {
    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="light"
        colors={mockColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    const link = screen.getByText('View on OpenStreetMap').closest('a');
    expect(link).toBeDefined();
    expect(link?.href).toContain('openstreetmap.org');
    expect(link?.href).toContain('mlat=' + mockGeo.lat);
    expect(link?.href).toContain('mlon=' + mockGeo.lon);
    expect(link?.href).not.toContain('google.com');
  });

  it('should show viewOnOpenStreetMap translation', () => {
    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="light"
        colors={mockColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('View on OpenStreetMap')).toBeDefined();
  });

  it('should display ip and coordinates in subheader', () => {
    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="light"
        colors={mockColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    // The subheader contains the IP address
    expect(screen.getByText(/192\.168\.1\.1/)).toBeDefined();
  });

  it('should initialize maplibre-gl Map with correct coordinates', async () => {
    const maplibregl = await import('maplibre-gl');
    const MockMap = vi.mocked(maplibregl.default.Map);
    MockMap.mockClear();

    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="light"
        colors={mockColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    expect(MockMap).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [mockGeo.lon, mockGeo.lat],
        zoom: 14,
      })
    );
  });

  it('should use dark CartoDB tiles for dark theme', async () => {
    const maplibregl = await import('maplibre-gl');
    const MockMap = vi.mocked(maplibregl.default.Map);
    MockMap.mockClear();

    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="dark"
        colors={mockDarkColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    const callArgs = MockMap.mock.calls[0][0] as unknown as { style: { sources: { carto: { tiles: string[] } } } };
    const tiles = callArgs.style.sources.carto.tiles;
    expect(tiles[0]).toContain('dark_all');
    expect(tiles[0]).toContain('cartocdn.com');
  });

  it('should use light CartoDB tiles for light theme', async () => {
    const maplibregl = await import('maplibre-gl');
    const MockMap = vi.mocked(maplibregl.default.Map);
    MockMap.mockClear();

    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="light"
        colors={mockColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    const callArgs = MockMap.mock.calls[0][0] as unknown as { style: { sources: { carto: { tiles: string[] } } } };
    const tiles = callArgs.style.sources.carto.tiles;
    expect(tiles[0]).toContain('voyager');
    expect(tiles[0]).toContain('cartocdn.com');
  });
});
