import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GeoLocation } from './geo-cache';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';

// Mock maplibre-gl - it doesn't work in jsdom
vi.mock('maplibre-gl', () => {
  const MockMap = vi.fn().mockImplementation(() => ({
    remove: vi.fn(),
  }));

  const MockMarker = vi.fn().mockImplementation(() => ({
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
  }));

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

const mockGeo: GeoLocation = {
  lat: 41.7151,
  lon: 44.8271,
  city: 'Tbilisi',
  region: 'Tbilisi',
  country: 'Georgia',
};

const mockTheme: ThemeSpec = {
  mode: 'light',
  colors: {
    borderColor: '#e0e0e0',
    textPrimary: '#1a1a1a',
    textTertiary: '#666666',
    accentBlue: '#0066cc',
    accentRed: '#cc0000',
  },
  tokens: {
    dashboardRadius: '0.75rem',
  },
} as ThemeSpec;

const mockDarkTheme: ThemeSpec = {
  ...mockTheme,
  mode: 'dark',
  colors: {
    ...mockTheme.colors,
    borderColor: '#333333',
    textPrimary: '#ffffff',
  },
} as ThemeSpec;

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
        theme={mockTheme}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    // The map container div is rendered (maplibre-gl mounts into it)
    expect(container.querySelector('div[style*="420px"]')).toBeDefined();
  });

  it('should show location label in header', () => {
    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        theme={mockTheme}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    // Location label is city, region, country
    expect(screen.getByText('Tbilisi, Tbilisi, Georgia')).toBeDefined();
  });

  it('should have link to OpenStreetMap (not Google Maps)', () => {
    render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        theme={mockTheme}
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
        theme={mockTheme}
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
        theme={mockTheme}
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
        theme={mockTheme}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    expect(MockMap).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [mockGeo.lon, mockGeo.lat],
        zoom: 13,
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
        theme={mockDarkTheme}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    const callArgs = MockMap.mock.calls[0][0] as { style: { sources: { carto: { tiles: string[] } } } };
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
        theme={mockTheme}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    const callArgs = MockMap.mock.calls[0][0] as { style: { sources: { carto: { tiles: string[] } } } };
    const tiles = callArgs.style.sources.carto.tiles;
    expect(tiles[0]).toContain('light_all');
    expect(tiles[0]).toContain('cartocdn.com');
  });
});
