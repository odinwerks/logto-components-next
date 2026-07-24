import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocsErrorFallback } from './docs-error-fallback';

vi.mock('@/app/logto-kit/components/providers/preferences', () => ({
  useThemeMode: () => ({
    mode: 'dark' as const,
    colors: {
      bgPage: '#000',
      bgSecondary: '#111',
      bgTertiary: '#1a1a1a',
      borderColor: '#333',
      textPrimary: '#fff',
      textTertiary: '#666',
      accentBlue: '#4a9eff',
      accentRed: '#ef4444',
      accentGreen: '#22c55e',
      accentYellow: '#f59e0b',
      contrastText: '#fff',
      errorBg: '#1a0000',
    },
  }),
  useLangMode: () => ({ lang: 'en-US' }),
}));

// getAllTranslations is NOT mocked — it returns the real static locale map.
// The en-US bundle defines t.common.error = 'ERROR' and t.common.retry = 'RETRY'.

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe('DocsErrorFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the translated error heading', () => {
    render(<DocsErrorFallback message="Test error" />);
    // en-US common.error = 'ERROR'
    expect(screen.getByText('ERROR')).toBeInTheDocument();
  });

  it('renders the translated retry button', () => {
    render(<DocsErrorFallback message="Test error" />);
    // en-US common.retry = 'RETRY'
    expect(screen.getByRole('button', { name: 'RETRY' })).toBeInTheDocument();
  });

  it('renders the error message text', () => {
    render(<DocsErrorFallback message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls router.refresh when retry button is clicked', () => {
    render(<DocsErrorFallback message="Test error" />);
    screen.getByRole('button', { name: 'RETRY' }).click();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('does NOT render legacy hardcoded "Error" string', () => {
    render(<DocsErrorFallback message="Test error" />);
    // The uppercase 'ERROR' from t.common.error is expected.
    // The old hardcoded string was "Error" (with only first letter capital).
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });
});
