import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import SessionHeartbeat, { withSessionActionLock } from './session-heartbeat';
import { recordHeartbeat } from '../../logic/actions/heartbeat';
import { readEnv } from '../../logic/env';

// Mock dependencies
vi.mock('../../logic/actions/heartbeat', () => ({
  recordHeartbeat: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock('../../logic/env', () => ({
  readEnv: vi.fn(),
}));

describe('SessionHeartbeat Component (BUG-024)', () => {
  let visibilityState: 'visible' | 'hidden' = 'visible';
  let documentListeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  let lockHeld = false;
  let lockWaiters: Array<() => void> = [];
  let nativeFetch: ReturnType<typeof vi.fn>;

  const installLockManager = () => {
    const request = vi.fn(async (
      name: string,
      optionsOrCallback: LockOptions | ((lock: Lock | null) => unknown),
      possibleCallback?: (lock: Lock | null) => unknown
    ) => {
      const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : possibleCallback;
      if (!callback) throw new Error('Missing lock callback');

      if (options.ifAvailable && lockHeld) return callback(null);
      while (lockHeld) {
        await new Promise<void>((resolve) => lockWaiters.push(resolve));
      }

      lockHeld = true;
      try {
        return await callback({ name, mode: 'exclusive' } as Lock);
      } finally {
        lockHeld = false;
        lockWaiters.shift()?.();
      }
    });

    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });

    return request;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(recordHeartbeat).mockReset().mockResolvedValue({ ok: true, data: undefined });
    visibilityState = 'visible';
    documentListeners = {};
    lockHeld = false;
    lockWaiters = [];
    nativeFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', nativeFetch);
    window.localStorage.clear();
    installLockManager();

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
    vi.unstubAllGlobals();
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

  it('defaults to upstream and does not start heartbeat loop if BACKEND_TYPE is unconfigured (undefined)', () => {
    vi.mocked(readEnv).mockReturnValue(undefined);

    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    render(<SessionHeartbeat />);

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

  it('silently swallows any errors returned by recordHeartbeat', async () => {
    vi.mocked(readEnv).mockReturnValue('blacktop');
    // With safeAction, recordHeartbeat always resolves (never rejects).
    // The component calls recordHeartbeat().catch(() => {}) to also handle
    // transport-level failures (network drops, 502, aborted requests).
    vi.mocked(recordHeartbeat).mockResolvedValue({ ok: false, error: 'INTERNAL_ERROR' });

    // Should not throw or crash client rendering when server action fails
    expect(() => render(<SessionHeartbeat />)).not.toThrow();
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('swallows transport-level rejections (BUG-M01) without producing unhandled rejections', async () => {
    vi.mocked(readEnv).mockReturnValue('blacktop');
    // Simulate a transport-level failure: the RPC promise rejects before the
    // server body runs (e.g. network drop, 502, aborted request).
    vi.mocked(recordHeartbeat).mockRejectedValue(new Error('fetch failed'));

    // Should not throw during render — the rejected promise must be caught
    expect(() => render(<SessionHeartbeat />)).not.toThrow();
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);

    // Flush the microtask queue so the .catch() handler runs and the
    // rejected promise does not bubble as an unhandled rejection.
    await vi.advanceTimersByTimeAsync(0);
  });

  it('keeps logout final when an in-flight heartbeat races sign-out (M-001)', async () => {
    vi.mocked(readEnv).mockReturnValue('blacktop');
    let finishHeartbeat!: () => void;
    let sessionState = 'authenticated';
    vi.mocked(recordHeartbeat).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        finishHeartbeat = resolve;
      });
      sessionState = 'heartbeat-applied';
      return { ok: true, data: undefined };
    });

    render(<SessionHeartbeat />);
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);

    const signOut = vi.fn(async () => {
      sessionState = 'signed-out';
    });
    const logoutResponse = withSessionActionLock('sign-out', signOut);
    await act(async () => Promise.resolve());

    // Sign-out must wait so its cookie-clearing result is applied last.
    expect(signOut).not.toHaveBeenCalled();

    await act(async () => {
      finishHeartbeat();
      await logoutResponse;
    });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(sessionState).toBe('signed-out');

    // A stale tab must not start another heartbeat after completed sign-out.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('does not serialize an unrelated Server Action behind the heartbeat lock (M-001)', async () => {
    vi.mocked(readEnv).mockReturnValue('blacktop');
    let finishHeartbeatResponse!: () => void;
    nativeFetch.mockImplementationOnce(() => new Promise<Response>((resolve) => {
      finishHeartbeatResponse = () => resolve(new Response(null, { status: 200 }));
    }));
    vi.mocked(recordHeartbeat).mockImplementationOnce(async () => {
      await window.fetch('/server-action', {
        method: 'POST',
        headers: { 'Next-Action': 'heartbeat-action' },
      });
      return { ok: true, data: undefined };
    });

    render(<SessionHeartbeat />);
    await act(async () => Promise.resolve());
    expect(recordHeartbeat).toHaveBeenCalledTimes(1);
    expect(nativeFetch).toHaveBeenCalledTimes(1);

    const unrelatedResponse = window.fetch('/server-action', {
      method: 'POST',
      headers: { 'Next-Action': 'unrelated-profile-action' },
    });

    // A profile/RBAC/MFA action must bypass the session lock entirely.
    expect(nativeFetch).toHaveBeenCalledTimes(2);
    await expect(unrelatedResponse).resolves.toBeInstanceOf(Response);

    await act(async () => {
      finishHeartbeatResponse();
    });
  });
});
