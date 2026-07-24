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

  it('suppresses refresh when window.__LDD_DASHBOARD_OPEN__ is true (D12)', async () => {
    // Set the dashboard-open flag before rendering
    window.__LDD_DASHBOARD_OPEN__ = true;

    render(<AuthWatcher debounceMs={1000} refreshIntervalMs={0} />);

    const visibilityCb = documentListeners['visibilitychange']?.[0];
    const onlineCb = windowListeners['online']?.[0];

    visibilityState = 'visible';
    await act(async () => {
      visibilityCb?.();
      onlineCb?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Must NOT call refresh when dashboard is open
    expect(mockRefresh).not.toHaveBeenCalled();

    // Clean up
    delete window.__LDD_DASHBOARD_OPEN__;
  });

  it('BUG-021: re-checks dashboard-open inside setTimeout callback (flag flips between schedule and execution)', async () => {
    // Dashboard is closed at schedule time
    window.__LDD_DASHBOARD_OPEN__ = false;

    render(<AuthWatcher debounceMs={100} refreshIntervalMs={0} />);

    const visibilityCb = documentListeners['visibilitychange']?.[0];

    // Trigger — guard at schedule passes (flag is false)
    visibilityState = 'visible';
    await act(async () => {
      visibilityCb?.();
    });

    // Flip the flag BEFORE the setTimeout(0) fires — simulating dashboard
    // opening in the tiny window between schedule and execution
    window.__LDD_DASHBOARD_OPEN__ = true;

    // Run the pending setTimeout(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Must NOT call refresh — the re-check inside setTimeout caught the flip
    expect(mockRefresh).not.toHaveBeenCalled();

    delete window.__LDD_DASHBOARD_OPEN__;
  });

  it('allows refresh when window.__LDD_DASHBOARD_OPEN__ is false', async () => {
    window.__LDD_DASHBOARD_OPEN__ = false;

    render(<AuthWatcher debounceMs={1000} refreshIntervalMs={0} />);

    const visibilityCb = documentListeners['visibilitychange']?.[0];

    visibilityState = 'visible';
    await act(async () => {
      visibilityCb?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);

    delete window.__LDD_DASHBOARD_OPEN__;
  });
});
