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

  it('server render shows desktop (SSR-safe); client render follows matchMedia', () => {
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

    // Client render: window exists, matchMedia returns matches:true → mobile
    const clientMarkup = renderToString(
      <DashboardRouter
        desktop={<div>desktop-dashboard</div>}
        mobile={<div>mobile-dashboard</div>}
      />,
    );

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    try {
      // Server render: window is undefined → lazy initializer returns false → desktop (SSR-safe default)
      const serverLikeMarkup = renderToString(
        <DashboardRouter
          desktop={<div>desktop-dashboard</div>}
          mobile={<div>mobile-dashboard</div>}
        />,
      );

      // Client follows matchMedia (mobile); server always defaults to desktop for SSR safety
      expect(clientMarkup).toContain('mobile-dashboard');
      expect(serverLikeMarkup).toContain('desktop-dashboard');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      });
    }
  });
});
