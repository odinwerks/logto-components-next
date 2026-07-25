import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { DashboardRouter, useIsPortrait } from './dashboard-router';

describe('DashboardRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not re-subscribe to media query listeners on subsequent renders', () => {
    const addEventListenerMock = vi.fn();
    const removeEventListenerMock = vi.fn();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    function TestComponent() {
      useIsPortrait();
      return <div>test</div>;
    }

    const { rerender } = render(<TestComponent />);
    expect(addEventListenerMock).toHaveBeenCalledTimes(1); // one for portrait only
    expect(removeEventListenerMock).not.toHaveBeenCalled();

    rerender(<TestComponent />);
    // With a stable subscribe function, re-render should not trigger unsubscribe & re-subscribe
    expect(addEventListenerMock).toHaveBeenCalledTimes(1);
    expect(removeEventListenerMock).not.toHaveBeenCalled();
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

  it('does NOT use narrow width media-query alone to trigger mobile layout', () => {
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

    // Narrow width alone should NOT trigger mobile — only orientation does.
    expect(screen.getByText('desktop-dashboard')).toBeInTheDocument();
  });

  it('renders only the active branch after hydration (BUG-009)', () => {
    // Portrait match → mobile should be the ONLY branch in the DOM after mount.
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
        desktop={<div data-testid="desktop">desktop-dashboard</div>}
        mobile={<div data-testid="mobile">mobile-dashboard</div>}
      />,
    );

    // After hydration effect runs, only the mobile branch is mounted.
    expect(screen.getByTestId('mobile')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop')).not.toBeInTheDocument();
  });

  it('renders only the desktop branch when not portrait after hydration (BUG-009)', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
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
        desktop={<div data-testid="desktop">desktop-dashboard</div>}
        mobile={<div data-testid="mobile">mobile-dashboard</div>}
      />,
    );

    expect(screen.getByTestId('desktop')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile')).not.toBeInTheDocument();
  });

  it('renders a neutral placeholder before the mount effect runs (BUG-2 no branch flash)', () => {
    // BUG-2 fix: during the `!mounted` gate, neither the desktop nor the
    // mobile branch should be painted — only a neutral placeholder. This
    // prevents the desktop profile tab ("personal") from flashing on portrait
    // devices before the orientation check flips to the mobile menu.
    //
    // The authoritative assertion is the renderToString SSR test above (SSR
    // never runs effects, so `mounted` stays false and the placeholder is
    // produced). Here we additionally confirm that the client, once mounted,
    // shows the mobile branch (portrait) and the placeholder is gone.
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

    const { container } = render(
      <DashboardRouter
        desktop={<div data-testid="desktop">desktop-dashboard</div>}
        mobile={<div data-testid="mobile">mobile-dashboard</div>}
      />,
    );

    // After effects flush (RTL default), the mobile branch is shown — the
    // placeholder was replaced by the real branch.
    expect(screen.getByTestId('mobile')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('renderToString always uses SSR snapshot; renders a neutral placeholder (no branch flash)', () => {
    // BUG-2 fix: the `!mounted` gate now renders a neutral placeholder div
    // instead of the desktop branch, so SSR + first client render never paint
    // the desktop profile tab on a portrait device. SSR (renderToString) has
    // no effects, so `mounted` stays false and the placeholder is produced.
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

    const ssrMarkup = renderToString(
      <DashboardRouter
        desktop={<div>desktop-dashboard</div>}
        mobile={<div>mobile-dashboard</div>}
      />,
    );

    // SSR renders the neutral placeholder, NOT the desktop branch — so the
    // "personal" tab never flashes on portrait devices during hydration.
    expect(ssrMarkup).not.toContain('desktop-dashboard');
    expect(ssrMarkup).not.toContain('mobile-dashboard');
    expect(ssrMarkup).toContain('aria-busy');

    // Client render with render() picks up matchMedia → mobile (after the
    // mount effect flushes via RTL).
    render(
      <DashboardRouter
        desktop={<div>desktop-dashboard</div>}
        mobile={<div>mobile-dashboard</div>}
      />,
    );

    expect(screen.getByText('mobile-dashboard')).toBeInTheDocument();
  });
});
