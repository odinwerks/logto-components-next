import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import AuthWatcher from './auth-watcher';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe('AuthWatcher Component (P-BUG-004)', () => {
  let visibilityState: 'visible' | 'hidden' = 'visible';
  let documentListeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  let windowListeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    visibilityState = 'visible';
    documentListeners = {};
    windowListeners = {};

    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);

    vi.spyOn(document, 'addEventListener').mockImplementation((event, cb) => {
      if (!documentListeners[event]) {
        documentListeners[event] = [];
      }
      documentListeners[event].push(cb as unknown as (...args: unknown[]) => void);
    });

    vi.spyOn(document, 'removeEventListener').mockImplementation((event, cb) => {
      if (documentListeners[event]) {
        documentListeners[event] = documentListeners[event].filter(l => cb !== l);
      }
    });

    vi.spyOn(window, 'addEventListener').mockImplementation((event, cb) => {
      if (!windowListeners[event]) {
        windowListeners[event] = [];
      }
      windowListeners[event].push(cb as unknown as (...args: unknown[]) => void);
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event, cb) => {
      if (windowListeners[event]) {
        windowListeners[event] = windowListeners[event].filter(l => cb !== l);
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('collapses rapid-fire events and debounces correctly', async () => {
    render(<AuthWatcher debounceMs={1000} refreshIntervalMs={0} />);

    // Get event handlers
    const visibilityCb = documentListeners['visibilitychange']?.[0];
    const onlineCb = windowListeners['online']?.[0];

    expect(visibilityCb).toBeDefined();
    expect(onlineCb).toBeDefined();

    // Trigger both at same time (0ms)
    visibilityState = 'visible';
    await act(async () => {
      visibilityCb?.();
      onlineCb?.();
    });

    // No immediate refresh should happen before timeout
    expect(mockRefresh).not.toHaveBeenCalled();

    // Run pending timeouts (next tick)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should only have called refresh once due to collapse
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Trigger another event during cooldown (at 500ms)
    await act(async () => {
      vi.advanceTimersByTime(500);
      onlineCb?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should still have called refresh only once due to rate limit/cooldown
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Trigger event after cooldown ends (at 1100ms)
    await act(async () => {
      vi.advanceTimersByTime(600); // 500 + 600 = 1100ms total elapsed
      onlineCb?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Should have refreshed a second time
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });
});
