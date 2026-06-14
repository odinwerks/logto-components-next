import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { LogtoProvider, useLogto } from './logto-provider';
import type { UserData } from '../../logic/types';

// Mock the actions module (network-dependent)
vi.mock('../../logic/actions', () => ({
  updateUserCustomData: vi.fn(),
}));

const mockUserData: UserData = {
  id: 'test-user',
  username: 'testuser',
  name: 'Test User',
  avatar: undefined,
  primaryEmail: 'test@example.com',
  primaryPhone: undefined,
  profile: { givenName: 'Test', familyName: 'User' },
  identities: {},
  customData: {},
  createdAt: 0,
  updatedAt: 0,
};

/**
 * Helper component that opens the dashboard on mount via context.
 */
function DashboardOpener() {
  const { openDashboard } = useLogto();
  useEffect(() => {
    openDashboard();
  }, [openDashboard]);
  return null;
}

function renderWithDashboard(
  userData: UserData,
  dashboard: { desktop: ReactNode; mobile: ReactNode },
) {
  return render(
    <LogtoProvider userData={userData} dashboard={dashboard}>
      <DashboardOpener />
      <div>page content</div>
    </LogtoProvider>,
  );
}

describe('LogtoProvider X button visibility (Issue 2)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default: not portrait (desktop view)
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
  });

  it('shows X button on desktop (landscape/wide) when dashboard is open', () => {
    renderWithDashboard(mockUserData, {
      desktop: <div>desktop-dashboard</div>,
      mobile: <div>mobile-dashboard</div>,
    });

    // X close button should be present on desktop
    expect(screen.getByLabelText('Close dashboard')).toBeInTheDocument();
  });

  it('hides X button on mobile (portrait/narrow) when dashboard is open', () => {
    // Override matchMedia for portrait/narrow (mobile) mode
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches:
        query === '(orientation: portrait)' || query === '(max-width: 64rem)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderWithDashboard(mockUserData, {
      desktop: <div>desktop-dashboard</div>,
      mobile: <div>mobile-dashboard</div>,
    });

    // X close button should NOT be present on mobile (back button handles it)
    expect(
      screen.queryByLabelText('Close dashboard'),
    ).not.toBeInTheDocument();
  });
});

describe('LogtoProvider contextValue memoization (LOG-002)', () => {
  it('returns the same context value reference on re-renders if dependencies do not change', () => {
    const contextValues: unknown[] = [];

    function TestConsumer() {
      const contextValue = useLogto();
      useEffect(() => {
        contextValues.push(contextValue);
      }, [contextValue]);
      return null;
    }

    const { rerender } = render(
      <LogtoProvider userData={mockUserData}>
        <TestConsumer />
      </LogtoProvider>
    );

    expect(contextValues).toHaveLength(1);
    const firstContextValue = contextValues[0];
    expect(firstContextValue).not.toBeNull();

    // Re-render with same props
    rerender(
      <LogtoProvider userData={mockUserData}>
        <TestConsumer />
      </LogtoProvider>
    );

    // If memoized, contextValues should still have length 1 because the effect did not re-run
    expect(contextValues).toHaveLength(1);
    expect(contextValues[0]).toBe(firstContextValue);
  });
});
