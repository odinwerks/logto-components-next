import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock next/font/google
vi.mock('next/font/google', () => ({
  IBM_Plex_Mono: () => ({ className: 'ibm-plex-mono', style: {}, variable: 'ibm-plex-mono-var' }),
  Instrument_Serif: () => ({ className: 'instrument-serif', style: {}, variable: 'instrument-serif-var' }),
  DM_Sans: () => ({ className: 'dm-sans', style: {}, variable: 'dm-sans-var' }),
}));

import GlobalError from './global-error';

// Default matchMedia mock: returns dark preference (matches: false for light query)
const defaultMatchMedia = vi.fn().mockImplementation(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

describe('GlobalError', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset sessionStorage between tests
    window.sessionStorage.removeItem('theme-mode');
    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');
    // Provide a default matchMedia implementation for jsdom
    window.matchMedia = defaultMatchMedia;
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    window.matchMedia = originalMatchMedia;
  });

  it('renders html and body tags with error message', () => {
    const error = new Error('Test global rendering crash');
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    expect(screen.getByText('Test global rendering crash')).toBeInTheDocument();
    expect(screen.getByText(/Render Error/i)).toBeInTheDocument();
  });

  it('renders digest hash if available', () => {
    const error = new Error('Database connection failed');
    (error as unknown as { digest: string }).digest = 'ERR_DB_12345';
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    expect(screen.getByText(/digest:/i)).toBeInTheDocument();
    expect(screen.getByText('ERR_DB_12345')).toBeInTheDocument();
  });

  it('calls reset when Try Again button is clicked', () => {
    const error = new Error('ChunkLoadError');
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    fireEvent.click(tryAgainBtn);
    expect(reset).toHaveBeenCalledOnce();
  });

  it('logs the error to console.error', () => {
    const error = new Error('Crash in root layout');
    const reset = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<GlobalError error={error} reset={reset} />);

    expect(consoleSpy).toHaveBeenCalledWith('[GlobalError] Crash inside root layout:', error);
    consoleSpy.mockRestore();
  });

  describe('theme preference (BUG-088)', () => {
    it('defaults to dark theme when no stored preference exists and OS prefers dark', () => {
      const error = new Error('test');
      render(<GlobalError error={error} reset={vi.fn()} />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('reads stored dark theme from sessionStorage', () => {
      window.sessionStorage.setItem('theme-mode', 'dark');
      const error = new Error('test');
      render(<GlobalError error={error} reset={vi.fn()} />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('reads stored light theme from sessionStorage', () => {
      window.sessionStorage.setItem('theme-mode', 'light');
      const error = new Error('test');
      render(<GlobalError error={error} reset={vi.fn()} />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('falls back to dark theme when no stored theme and OS prefers light (BUG-VL17 fix)', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: light)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const error = new Error('test');
      render(<GlobalError error={error} reset={vi.fn()} />);

      // BUG-VL17: global-error.tsx now defaults to dark to match root layout's DEFAULT_THEME_MODE.
      // OS preference is intentionally ignored to avoid dark→light flash on error page.
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('falls back to dark when no stored theme and matchMedia returns false for light', () => {
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const error = new Error('test');
      render(<GlobalError error={error} reset={vi.fn()} />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('ignores invalid stored values and falls back to OS preference', () => {
      window.sessionStorage.setItem('theme-mode', 'invalid-value');
      const error = new Error('test');
      render(<GlobalError error={error} reset={vi.fn()} />);

      // Should fall back to dark (default mock returns matches: false)
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('stored theme takes precedence over OS preference', () => {
      window.sessionStorage.setItem('theme-mode', 'light');
      // OS prefers dark
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const error = new Error('test');
      render(<GlobalError error={error} reset={vi.fn()} />);

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('auto-retry', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls reset after 30s via interval', () => {
      vi.useFakeTimers();
      const error = new Error('transient crash');
      const reset = vi.fn();

      render(<GlobalError error={error} reset={reset} />);

      expect(reset).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(reset).toHaveBeenCalledTimes(1);
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(reset).toHaveBeenCalledTimes(2);
    });

    it('calls reset on window online event', () => {
      const error = new Error('offline crash');
      const reset = vi.fn();

      render(<GlobalError error={error} reset={reset} />);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      expect(reset).toHaveBeenCalledTimes(1);
    });

    it('calls reset on visibilitychange when document becomes visible', () => {
      const error = new Error('hidden crash');
      const reset = vi.fn();
      const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');

      render(<GlobalError error={error} reset={reset} />);

      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      try {
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(reset).toHaveBeenCalledTimes(1);
      } finally {
        if (originalVisibility) {
          Object.defineProperty(document, 'visibilityState', originalVisibility);
        } else {
          delete (document as unknown as Record<string, unknown>).visibilityState;
        }
      }
    });

    it('does NOT call reset after unmount', () => {
      vi.useFakeTimers();
      const error = new Error('unmounted crash');
      const reset = vi.fn();

      const { unmount } = render(<GlobalError error={error} reset={reset} />);
      unmount();

      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(reset).not.toHaveBeenCalled();
    });
  });
});
