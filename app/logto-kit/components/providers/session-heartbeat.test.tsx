import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import SessionHeartbeat from './session-heartbeat';
import { recordHeartbeat } from '../../logic/actions/heartbeat';
import { readEnv } from '../../logic/env';

// Mock dependencies
vi.mock('../../logic/actions/heartbeat', () => ({
  recordHeartbeat: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../logic/env', () => ({
  readEnv: vi.fn(),
}));

describe('SessionHeartbeat Component (BUG-024)', () => {
  let visibilityState: 'visible' | 'hidden' = 'visible';
  let documentListeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    visibilityState = 'visible';
    documentListeners = {};

    // Mock document.visibilityState
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);

    // Mock document.addEventListener / removeEventListener to track listeners precisely
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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not start heartbeat loop or register any listeners/timers if BACKEND_TYPE is upstream', () => {
    vi.mocked(readEnv).mockReturnValue('upstream');

    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    render(<SessionHeartbeat />);

    // Under upstream (Logto Cloud), the component must gracefully exit early
    // without making pings, setting timers, or listening for visibility changes.
    expect(recordHeartbeat).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(documentListeners['visibilitychange']).toBeUndefined();
  });

  it('starts the heartbeat loop and makes periodic requests if BACKEND_TYPE is blacktop', async () => {
    vi.mocked(readEnv).mockReturnValue('blacktop');

    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    render(<SessionHeartbeat />);

    // Should call recordHeartbeat immediately on mount
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);

    // Should set 30s interval
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);

    // Should add visibilitychange event listener
    expect(documentListeners['visibilitychange']).toHaveLength(1);

    // Fast-forward interval
    await vi.advanceTimersByTimeAsync(30000);
    expect(recordHeartbeat).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(30000);
    expect(recordHeartbeat).toHaveBeenCalledTimes(3);
  });

  it('pings immediately when tab becomes visible if not debounced', async () => {
    vi.mocked(readEnv).mockReturnValue('blacktop');

    render(<SessionHeartbeat />);
    expect(recordHeartbeat).toHaveBeenCalledTimes(1); // On mount

    // Simulate tab hiding
    visibilityState = 'hidden';
    const callback = documentListeners['visibilitychange']?.[0];
    expect(callback).toBeDefined();

    callback?.();
    // Should not ping on hide
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);

    // Advance time by 11 seconds to clear the debounce (DEBOUNCE_MS = 10s)
    await vi.advanceTimersByTimeAsync(11000);

    // Simulate tab becoming visible
    visibilityState = 'visible';
    callback?.();

    // Should ping immediately upon visibility change since debounce time has passed
    expect(recordHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('does not ping on visibility change if within debounce time', async () => {
    vi.mocked(readEnv).mockReturnValue('blacktop');

    render(<SessionHeartbeat />);
    expect(recordHeartbeat).toHaveBeenCalledTimes(1); // On mount

    // Simulate tab hiding
    visibilityState = 'hidden';
    const callback = documentListeners['visibilitychange']?.[0];
    expect(callback).toBeDefined();

    callback?.();
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);

    // Advance time by 5 seconds (less than 10s debounce)
    await vi.advanceTimersByTimeAsync(5000);

    // Simulate tab becoming visible
    visibilityState = 'visible';
    callback?.();

    // Should NOT ping because it was debounced
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('silently swallows any errors thrown by recordHeartbeat', async () => {
    vi.mocked(readEnv).mockReturnValue('blacktop');
    vi.mocked(recordHeartbeat).mockRejectedValue(new Error('Action failed'));

    // Should not throw or crash client rendering when server action fails
    expect(() => render(<SessionHeartbeat />)).not.toThrow();
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);
  });
});
