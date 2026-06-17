/**
 * Tests for the landing page (app/page.tsx).
 *
 * The landing page is a client component that renders a simple entry point.
 * It uses `useLogto()` from the provider context, which is mocked here.
 *
 * The landing page:
 * - Is accessible without authentication (proxy public whitelist).
 * - Shows a UserButton (anonymous avatar when unauthenticated).
 * - Has a "View Demo" link (public, direct navigation).
 * - Has a "Documentation" button that opens the sign-in modal for unauthenticated
 *   users, or navigates directly for authenticated users.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock useLogto so we can test both authenticated and unauthenticated states.
const mockOpenDashboard = vi.fn();
const mockUseLogto = vi.fn();

vi.mock('./logto-kit/components/providers/logto-provider', () => ({
  useLogto: () => mockUseLogto(),
}));

// Mock UserButton — it's a complex client component; we only care that it renders.
vi.mock('./logto-kit/components/UserButton', () => ({
  UserButton: () => <div data-testid="user-button" />,
}));

import HomePage from './page';

describe('HomePage landing page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLogto.mockReturnValue({
      isAuthenticated: false,
      openDashboard: mockOpenDashboard,
    });
  });

  it('renders without crashing', () => {
    render(<HomePage />);
    expect(screen.getByText('Logto Components Kit')).toBeTruthy();
  });

  it('renders the UserButton', () => {
    render(<HomePage />);
    expect(screen.getByTestId('user-button')).toBeTruthy();
  });

  it('renders a View Demo link pointing to /demo', () => {
    render(<HomePage />);
    const link = screen.getByText('View Demo').closest('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('/demo');
  });

  it('opens the auth modal when Documentation is clicked and user is unauthenticated', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByText('Documentation'));
    expect(mockOpenDashboard).toHaveBeenCalledWith({
      routeTo: '/getting-started/pre-requisites',
    });
  });

  it('navigates directly when Documentation is clicked and user is authenticated', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    const mockLocation = { href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
      configurable: true,
    });

    mockUseLogto.mockReturnValue({
      isAuthenticated: true,
      openDashboard: mockOpenDashboard,
    });

    render(<HomePage />);
    fireEvent.click(screen.getByText('Documentation'));

    expect(mockOpenDashboard).not.toHaveBeenCalled();
    expect(mockLocation.href).toBe('/getting-started/pre-requisites');

    if (originalDescriptor) {
      Object.defineProperty(window, 'location', originalDescriptor);
    }
  });
});
