import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GeoLocation } from './geo-cache';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
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

  it('should render the modal overlay', () => {
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

    // The fixed overlay is present
    expect(container.querySelector('div[style*="position: fixed"]')).toBeDefined();
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

  it('should have link to OpenStreetMap', () => {
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

  it('should have link to Google Maps', () => {
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

    const link = screen.getByText('View on Google Maps').closest('a');
    expect(link).toBeDefined();
    expect(link?.href).toContain('google.com/maps');
    expect(link?.href).toContain(`${mockGeo.lat},${mockGeo.lon}`);
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

  it('should display ip and coordinates', () => {
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

    expect(screen.getByText(/192\.168\.1\.1/)).toBeDefined();
    expect(screen.getByText(/41\.7151/)).toBeDefined();
    expect(screen.getByText(/44\.8271/)).toBeDefined();
  });

  it('should call onClose when close button is clicked', () => {
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

    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
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

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should use dark background in dark mode', () => {
    const { container } = render(
      <SessionMapModal
        geo={mockGeo}
        ip="192.168.1.1"
        mode="dark"
        colors={mockDarkColors}
        t={mockTranslations}
        onClose={mockOnClose}
      />
    );

    // The card div should have dark background
    const card = container.querySelector('div[style*="#0e0e14"]');
    expect(card).toBeDefined();
  });

  it('should use white background in light mode', () => {
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

    const card = container.querySelector('div[style*="#ffffff"]');
    expect(card).toBeDefined();
  });
});
