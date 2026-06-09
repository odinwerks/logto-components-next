import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { DashboardRouter } from './dashboard-router';

describe('DashboardRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses portrait media-query match on first client render', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(orientation: portrait)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <DashboardRouter
        desktop={<div>desktop-dashboard</div>}
        mobile={<div>mobile-dashboard</div>}
      />,
    );

    expect(screen.getByText('mobile-dashboard')).toBeInTheDocument();
  });

  it('uses narrow width media-query match on first client render', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 64rem)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <DashboardRouter
        desktop={<div>desktop-dashboard</div>}
        mobile={<div>mobile-dashboard</div>}
      />,
    );

    expect(screen.getByText('mobile-dashboard')).toBeInTheDocument();
  });

  it('renderToString always uses SSR snapshot (desktop); client render follows matchMedia', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(orientation: portrait)' || query === '(max-width: 64rem)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // renderToString always uses useSyncExternalStore's SSR snapshot (third arg = false),
    // so it always renders desktop regardless of matchMedia
    const ssrMarkup = renderToString(
      <DashboardRouter
        desktop={<div>desktop-dashboard</div>}
        mobile={<div>mobile-dashboard</div>}
      />,
    );

    // Client render with render() picks up matchMedia → mobile
    render(
      <DashboardRouter
        desktop={<div>desktop-dashboard</div>}
        mobile={<div>mobile-dashboard</div>}
      />,
    );

    // SSR snapshot always returns false → desktop; client follows matchMedia → mobile
    expect(ssrMarkup).toContain('desktop-dashboard');
    expect(screen.getByText('mobile-dashboard')).toBeInTheDocument();
  });
});
