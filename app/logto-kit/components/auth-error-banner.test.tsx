import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/navigation
let searchParams = new URLSearchParams();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="alert-icon" {...props} />
  ),
  X: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="x-icon" {...props} />
  ),
}));

import { AuthErrorBanner } from './auth-error-banner';

describe('AuthErrorBanner', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    mockReplace.mockClear();
    vi.clearAllMocks();
  });

  it('renders nothing when no auth_error param', () => {
    const { container } = render(<AuthErrorBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error banner when auth_error is present', () => {
    searchParams = new URLSearchParams('auth_error=access_denied');
    render(<AuthErrorBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('access_denied')).toBeInTheDocument();
    expect(screen.getByText(/Authentication error:/)).toBeInTheDocument();
  });

  it('displays the error code in bold', () => {
    searchParams = new URLSearchParams('auth_error=login_required');
    render(<AuthErrorBanner />);

    const strongElement = screen.getByText('login_required');
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('renders alert icon', () => {
    searchParams = new URLSearchParams('auth_error=invalid_request');
    render(<AuthErrorBanner />);

    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('has dismiss button with accessible label', () => {
    searchParams = new URLSearchParams('auth_error=access_denied');
    render(<AuthErrorBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('hides banner when dismiss button is clicked', () => {
    searchParams = new URLSearchParams('auth_error=access_denied');
    render(<AuthErrorBanner />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();

    const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
    fireEvent.click(dismissButton);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls router.replace to strip auth_error param on dismiss', () => {
    searchParams = new URLSearchParams('auth_error=access_denied');
    render(<AuthErrorBanner />);

    const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
    fireEvent.click(dismissButton);

    expect(mockReplace).toHaveBeenCalledOnce();
    // After removing auth_error, params is empty, so it should use window.location.pathname
    expect(mockReplace).toHaveBeenCalledWith(window.location.pathname);
  });

  it('has proper aria attributes for accessibility', () => {
    searchParams = new URLSearchParams('auth_error=interaction_required');
    render(<AuthErrorBanner />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('renders various OAuth error codes correctly', () => {
    const errorCodes = [
      'access_denied',
      'invalid_request',
      'unauthorized_client',
      'server_error',
      'interaction_required',
      'login_required',
    ];

    for (const code of errorCodes) {
      searchParams = new URLSearchParams(`auth_error=${code}`);
      const { unmount } = render(<AuthErrorBanner />);

      expect(screen.getByText(code)).toBeInTheDocument();
      unmount();
    }
  });
});
