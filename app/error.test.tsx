import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ErrorPage from './error';

describe('ErrorPage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the error message', () => {
    const error = new Error('RSC fetch failed');
    const reset = vi.fn();

    render(<ErrorPage error={error} reset={reset} />);

    expect(screen.getByText('RSC fetch failed')).toBeInTheDocument();
    expect(screen.getByText(/Render Error/i)).toBeInTheDocument();
  });

  it('calls reset when Try again button is clicked', () => {
    const error = new Error('ChunkLoadError');
    const reset = vi.fn();

    render(<ErrorPage error={error} reset={reset} />);

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    fireEvent.click(tryAgainBtn);
    expect(reset).toHaveBeenCalledOnce();
  });

  it('calls reset after 30s via interval', () => {
    vi.useFakeTimers();
    const error = new Error('transient error');
    const reset = vi.fn();

    render(<ErrorPage error={error} reset={reset} />);

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
    const error = new Error('offline error');
    const reset = vi.fn();

    render(<ErrorPage error={error} reset={reset} />);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('calls reset on visibilitychange when document becomes visible', () => {
    const error = new Error('hidden error');
    const reset = vi.fn();
    const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');

    render(<ErrorPage error={error} reset={reset} />);

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
    const error = new Error('unmounted error');
    const reset = vi.fn();

    const { unmount } = render(<ErrorPage error={error} reset={reset} />);
    unmount();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(reset).not.toHaveBeenCalled();
  });
});
