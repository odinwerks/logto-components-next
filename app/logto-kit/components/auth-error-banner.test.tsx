import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { enUS } from '../locales/en-US';
import { ukUA } from '../locales/uk-UA';

const langState = vi.hoisted(() => ({ current: 'en-US' }));

vi.mock('./providers/preferences', () => ({
  useLangMode: () => ({ lang: langState.current, setLang: vi.fn() }),
}));

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
    langState.current = 'en-US';
    mockReplace.mockClear();
    vi.clearAllMocks();
  });

  it('renders nothing when no auth_error param', () => {
    const { container } = render(<AuthErrorBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a localized error banner when auth_error is present', () => {
    searchParams = new URLSearchParams('auth_error=access_denied');
    render(<AuthErrorBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(enUS.errors.access_denied)).toBeInTheDocument();
    expect(screen.queryByText('access_denied')).not.toBeInTheDocument();
    expect(screen.getByText(/Authentication error:/)).toBeInTheDocument();
  });

  it('displays the localized error message in bold', () => {
    searchParams = new URLSearchParams('auth_error=login_required');
    render(<AuthErrorBanner />);

    const strongElement = screen.getByText(enUS.errors.login_required);
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

  it('calls router.replace to strip auth_error param automatically on mount', () => {
    searchParams = new URLSearchParams('auth_error=access_denied');
    render(<AuthErrorBanner />);

    expect(mockReplace).toHaveBeenCalledOnce();
    // After removing auth_error, params is empty, so it should use window.location.pathname
    expect(mockReplace).toHaveBeenCalledWith(window.location.pathname);
  });

  it('has proper aria attributes for accessibility', () => {
    searchParams = new URLSearchParams('auth_error=interaction_required');
    render(<AuthErrorBanner />);

    const alert = screen.getByRole('alert');
    // role="alert" implies aria-live="assertive"; no redundant aria-live should be set
    expect(alert).not.toHaveAttribute('aria-live');
  });

  it('renders localized messages for known OAuth error codes', () => {
    const errorCodes = [
      ['access_denied', enUS.errors.access_denied],
      ['invalid_request', enUS.errors.invalid_request],
      ['unauthorized_client', enUS.errors.unauthorized_client],
      ['server_error', enUS.errors.server_error],
      ['interaction_required', enUS.errors.interaction_required],
      ['login_required', enUS.errors.login_required],
    ] as const;

    for (const [code, message] of errorCodes) {
      searchParams = new URLSearchParams(`auth_error=${code}`);
      const { unmount } = render(<AuthErrorBanner />);

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.queryByText(code)).not.toBeInTheDocument();
      unmount();
    }
  });

  it('uses the active locale for known OAuth errors', () => {
    langState.current = 'uk-UA';
    searchParams = new URLSearchParams('auth_error=access_denied');

    render(<AuthErrorBanner />);

    expect(screen.getByText(ukUA.errors.access_denied)).toBeInTheDocument();
    expect(screen.queryByText('access_denied')).not.toBeInTheDocument();
  });

  it('uses a localized generic fallback without exposing unknown input', () => {
    searchParams = new URLSearchParams('auth_error=Please+send+your+password');

    render(<AuthErrorBanner />);

    expect(screen.getByText(enUS.errors.OAUTH_UNKNOWN_ERROR)).toBeInTheDocument();
    expect(screen.queryByText('Please send your password')).not.toBeInTheDocument();
    expect(screen.queryByText('authentication_error')).not.toBeInTheDocument();
  });
});
