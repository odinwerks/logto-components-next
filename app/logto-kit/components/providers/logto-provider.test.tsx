import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { LogtoProvider, useLogto } from './logto-provider';
import type { UserData } from '../../logic/types';

// Mock the actions module (network-dependent)
vi.mock('../../logic/actions', () => ({
  updateUserCustomData: vi.fn(),
}));

// Mock AuthPromptModal to isolate the conditional render test
vi.mock('../client/AuthPromptModal', () => ({
  AuthPromptModal: ({ routeTo, mode }: { routeTo?: string; mode?: 'optional' | 'mandatory' }) => (
    <div data-testid="auth-prompt-modal" data-route-to={routeTo ?? ''} data-mode={mode ?? ''}>
      Auth Prompt
    </div>
  ),
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

  it('shows X button on mobile (portrait/narrow) when dashboard is open (BUG-L18 fix: always visible)', () => {
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

    // X close button should now be present on mobile too (BUG-L18: touch close affordance)
    expect(
      screen.getByLabelText('Close dashboard'),
    ).toBeInTheDocument();
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

describe('LogtoProvider unauthenticated mode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it('renders children when unauthenticated (no userData)', () => {
    render(
      <LogtoProvider dashboard={<div data-testid="dashboard">Dashboard</div>}>
        <div data-testid="children">Children</div>
      </LogtoProvider>
    );

    expect(screen.getByTestId('children')).toBeInTheDocument();
    // Dashboard should NOT be shown until openDashboard() is called
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('exposes isAuthenticated=false when no userData is provided', () => {
    let capturedIsAuthenticated: boolean | undefined;

    function IsAuthChecker() {
      const { isAuthenticated } = useLogto();
      useEffect(() => {
        capturedIsAuthenticated = isAuthenticated;
      }, [isAuthenticated]);
      return null;
    }

    render(
      <LogtoProvider>
        <IsAuthChecker />
      </LogtoProvider>
    );

    expect(capturedIsAuthenticated).toBe(false);
  });

  it('exposes isAuthenticated=true when userData is provided', () => {
    let capturedIsAuthenticated: boolean | undefined;

    function IsAuthChecker() {
      const { isAuthenticated } = useLogto();
      useEffect(() => {
        capturedIsAuthenticated = isAuthenticated;
      }, [isAuthenticated]);
      return null;
    }

    render(
      <LogtoProvider userData={mockUserData}>
        <IsAuthChecker />
      </LogtoProvider>
    );

    expect(capturedIsAuthenticated).toBe(true);
  });

  it('openDashboard accepts opts with routeTo', () => {
    let capturedOpenDashboard: ((opts?: { routeTo?: string }) => void) | undefined;

    function DashboardOpenerCapture() {
      const { openDashboard } = useLogto();
      useEffect(() => {
        capturedOpenDashboard = openDashboard;
      }, [openDashboard]);
      return null;
    }

    render(
      <LogtoProvider>
        <DashboardOpenerCapture />
      </LogtoProvider>
    );

    // Should not throw when called with opts
    expect(() => act(() => { capturedOpenDashboard?.({ routeTo: '/profile' }); })).not.toThrow();
  });
});

describe('LogtoProvider auth-conditional dashboard (Task 5)', () => {
  /** Helper to set up a non-portrait (desktop) matchMedia mock. */
  function mockDesktopMatchMedia() {
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
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    mockDesktopMatchMedia();
  });

  it('shows AuthPromptModal when dashboard opened while unauthenticated (no userData)', () => {
    render(
      <LogtoProvider dashboard={<div data-testid="real-dashboard">Dashboard</div>}>
        <DashboardOpener />
      </LogtoProvider>
    );

    // Should show AuthPromptModal, not the real dashboard
    expect(screen.getByTestId('auth-prompt-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('real-dashboard')).not.toBeInTheDocument();
  });

  it('passes routeTo to AuthPromptModal when unauthenticated', () => {
    function DashboardOpenerWithRoute() {
      const { openDashboard } = useLogto();
      useEffect(() => {
        openDashboard({ routeTo: '/protected-page' });
      }, [openDashboard]);
      return null;
    }

    render(
      <LogtoProvider dashboard={<div data-testid="real-dashboard">Dashboard</div>}>
        <DashboardOpenerWithRoute />
      </LogtoProvider>
    );

    const modal = screen.getByTestId('auth-prompt-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('data-route-to', '/protected-page');
  });

  it('shows real dashboard content when authenticated (has userData)', () => {
    render(
      <LogtoProvider userData={mockUserData} dashboard={<div data-testid="real-dashboard">Dashboard</div>}>
        <DashboardOpener />
      </LogtoProvider>
    );

    // DashboardRouter renders both desktop+mobile slots, so the node appears twice.
    // Confirm at least one real dashboard element is visible.
    const dashboardEls = screen.getAllByTestId('real-dashboard');
    expect(dashboardEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('auth-prompt-modal')).not.toBeInTheDocument();
  });

  it('shows AuthPromptModal even without dashboard prop when unauthenticated', () => {
    // No dashboard prop — but user is unauthenticated
    render(
      <LogtoProvider>
        <DashboardOpener />
      </LogtoProvider>
    );

    // AuthPromptModal should still appear
    expect(screen.getByTestId('auth-prompt-modal')).toBeInTheDocument();
  });

  it('passes undefined routeTo to AuthPromptModal when openDashboard called without opts', () => {
    render(
      <LogtoProvider dashboard={<div data-testid="real-dashboard">Dashboard</div>}>
        <DashboardOpener />
      </LogtoProvider>
    );

    const modal = screen.getByTestId('auth-prompt-modal');
    expect(modal).toBeInTheDocument();
    // data-route-to should be empty string (our mock maps undefined to '')
    expect(modal).toHaveAttribute('data-route-to', '');
  });
});

describe('LogtoProvider modal mode passing (auth-gated hardening)', () => {
  function mockDesktopMatchMedia() {
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
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    mockDesktopMatchMedia();
  });

  it('passes mode=mandatory to AuthPromptModal when openDashboard is called with mode mandatory', () => {
    function DashboardOpenerWithMode() {
      const { openDashboard } = useLogto();
      useEffect(() => {
        openDashboard({ routeTo: '/protected', mode: 'mandatory' });
      }, [openDashboard]);
      return null;
    }

    render(
      <LogtoProvider dashboard={<div>Dashboard</div>}>
        <DashboardOpenerWithMode />
      </LogtoProvider>
    );

    const modal = screen.getByTestId('auth-prompt-modal');
    expect(modal).toHaveAttribute('data-mode', 'mandatory');
    expect(modal).toHaveAttribute('data-route-to', '/protected');
  });

  it('passes mode=optional to AuthPromptModal when openDashboard is called with mode optional', () => {
    function DashboardOpenerWithOptional() {
      const { openDashboard } = useLogto();
      useEffect(() => {
        openDashboard({ mode: 'optional' });
      }, [openDashboard]);
      return null;
    }

    render(
      <LogtoProvider dashboard={<div>Dashboard</div>}>
        <DashboardOpenerWithOptional />
      </LogtoProvider>
    );

    const modal = screen.getByTestId('auth-prompt-modal');
    expect(modal).toHaveAttribute('data-mode', 'optional');
  });

  it('passes empty mode to AuthPromptModal when openDashboard called without mode', () => {
    render(
      <LogtoProvider dashboard={<div>Dashboard</div>}>
        <DashboardOpener />
      </LogtoProvider>
    );

    const modal = screen.getByTestId('auth-prompt-modal');
    // data-mode should be empty string (our mock maps undefined to '')
    expect(modal).toHaveAttribute('data-mode', '');
  });
});
