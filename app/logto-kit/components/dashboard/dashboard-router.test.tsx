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

  it('keeps initial render deterministic regardless of matchMedia availability', () => {
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
      const serverLikeMarkup = renderToString(
        <DashboardRouter
          desktop={<div>desktop-dashboard</div>}
          mobile={<div>mobile-dashboard</div>}
        />,
      );

      expect(clientMarkup).toContain('desktop-dashboard');
      expect(serverLikeMarkup).toContain('desktop-dashboard');
      expect(clientMarkup).toBe(serverLikeMarkup);
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      });
    }
  });
});
