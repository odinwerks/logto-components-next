import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { enUS } from '../logto-kit/locales/en-US';

// --- Mocks ---

const mockFetchDashboardDataCached = vi.fn();
vi.mock('../logto-kit/logic/cached-dashboard', () => ({
  fetchDashboardDataCached: (...args: unknown[]) => mockFetchDashboardDataCached(...args),
}));

// Mock next/navigation for AuthErrorBanner and DocsLayoutClient
let searchParams = new URLSearchParams();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/getting-started/prereqs',
}));

// Mock lucide-react icons used by AuthErrorBanner
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="alert-icon" {...props} />
  ),
  X: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="x-icon" {...props} />
  ),
}));

// Mock docs-specific client components
vi.mock('../demo/Sidebar', () => ({
  default: () => <aside data-testid="sidebar" />,
}));

vi.mock('../demo/MobileDocsNav', () => ({
  default: () => <nav data-testid="mobile-nav" />,
}));

vi.mock('../demo/nav-data', () => ({
  NAV_ITEMS: [],
}));

vi.mock('../logto-kit', () => ({
  useIsPortrait: () => false,
}));

// --- Import after mocks ---
import DocsLayout from './layout';

describe('DocsLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    mockReplace.mockClear();
  });

  describe('needsAuth branch (unauthenticated public docs)', () => {
    it('renders AuthErrorBanner when auth_error query param is present', async () => {
      mockFetchDashboardDataCached.mockResolvedValueOnce({
        success: false,
        needsAuth: true,
      });
      searchParams = new URLSearchParams('auth_error=access_denied');

      const jsx = await DocsLayout({ children: <div>Docs content</div> });
      render(jsx as React.ReactElement);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(enUS.errors.access_denied)).toBeInTheDocument();
      expect(screen.queryByText('access_denied')).not.toBeInTheDocument();
      expect(screen.getByText(/Authentication error:/)).toBeInTheDocument();
    });

    it('renders children content in the needsAuth branch', async () => {
      mockFetchDashboardDataCached.mockResolvedValueOnce({
        success: false,
        needsAuth: true,
      });

      const jsx = await DocsLayout({ children: <div>Public docs page</div> });
      render(jsx as React.ReactElement);

      expect(screen.getByText('Public docs page')).toBeInTheDocument();
    });

    it('renders without banner when no auth_error param', async () => {
      mockFetchDashboardDataCached.mockResolvedValueOnce({
        success: false,
        needsAuth: true,
      });

      const jsx = await DocsLayout({ children: <div>Docs content</div> });
      render(jsx as React.ReactElement);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('Docs content')).toBeInTheDocument();
    });
  });

  describe('authenticated branch', () => {
    it('renders AuthErrorBanner when auth_error query param is present', async () => {
      mockFetchDashboardDataCached.mockResolvedValueOnce({
        success: true,
        data: { user: { sub: 'user-1' } },
      });
      searchParams = new URLSearchParams('auth_error=login_required');

      const jsx = await DocsLayout({ children: <div>Authenticated docs</div> });
      render(jsx as React.ReactElement);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(enUS.errors.login_required)).toBeInTheDocument();
      expect(screen.queryByText('login_required')).not.toBeInTheDocument();
    });

    it('renders children content in the authenticated branch', async () => {
      mockFetchDashboardDataCached.mockResolvedValueOnce({
        success: true,
        data: { user: { sub: 'user-1' } },
      });

      const jsx = await DocsLayout({ children: <div>Authenticated content</div> });
      render(jsx as React.ReactElement);

      expect(screen.getByText('Authenticated content')).toBeInTheDocument();
    });
  });

  describe('error fallback branch', () => {
    it('renders DocsErrorFallback when result is neither success nor needsAuth', async () => {
      mockFetchDashboardDataCached.mockResolvedValueOnce({
        success: false,
        error: new Error('Unexpected failure'),
      });

      const jsx = await DocsLayout({ children: <div>Should not render</div> });
      render(jsx as React.ReactElement);

      // DocsErrorFallback renders its own error UI; children should not appear
      expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
    });
  });
});
