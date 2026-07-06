import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardRouter } from '/home/ubuntu/Dev/logto-dash/app/logto-kit/components/dashboard/dashboard-router';

describe('diag', () => {
  it('DEBUG', () => {
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
    screen.debug();
    expect(true).toBe(true);
  });
});
