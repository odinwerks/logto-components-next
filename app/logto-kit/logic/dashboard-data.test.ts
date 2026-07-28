import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Module Mocks
// ============================================================================

const mockGetLogtoContext = vi.fn();
vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: (...args: unknown[]) => mockGetLogtoContext(...args),
}));

vi.mock('../config', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({
    endpoint: 'https://test.logto.app',
    appId: 'test-app-id',
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('./log', () => ({
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
}));

import { _internals, fetchDashboardDataCore } from './dashboard-data';
import { redirect } from 'next/navigation';

const { fetchWithTimeout, fetchWithRetry } = _internals;

// ============================================================================
// fetchWithTimeout — BUG-064: signal wiring
// ============================================================================

describe('fetchWithTimeout (BUG-064 signal wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes an AbortSignal to the callback function', async () => {
    let receivedSignal: AbortSignal | undefined;

    const fn = vi.fn(async (signal: AbortSignal) => {
      receivedSignal = signal;
      return 'ok';
    });

    const result = await fetchWithTimeout(fn, 10_000);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    // Signal should not be aborted yet since fn resolved before timeout
    expect(receivedSignal!.aborted).toBe(false);
  });

  it('aborts the signal when the timeout fires', async () => {
    vi.useFakeTimers();

    let receivedSignal: AbortSignal | undefined;

    // fn never resolves — timeout should fire
    const fn = vi.fn(async (signal: AbortSignal) => {
      receivedSignal = signal;
      // Never resolve — simulating a hanging fetch
      return new Promise<string>(() => {});
    });

    const promise = fetchWithTimeout(fn, 5_000);

    // Advance past the timeout
    vi.advanceTimersByTime(5_001);

    await expect(promise).rejects.toThrow('Request timed out');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(true);

    vi.useRealTimers();
  });

  it('clears the timeout when fn resolves before timeout', async () => {
    vi.useFakeTimers();

    const fn = vi.fn(async (_signal: AbortSignal) => {
      return 'quick result';
    });

    const promise = fetchWithTimeout(fn, 10_000);

    // Let the promise resolve (microtask)
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('quick result');
    expect(fn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('clears the timeout when fn rejects before timeout', async () => {
    const fn = vi.fn(async (_signal: AbortSignal) => {
      throw new Error('immediate failure');
    });

    await expect(fetchWithTimeout(fn, 10_000)).rejects.toThrow('immediate failure');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not abort signal when fn resolves quickly', async () => {
    const fn = vi.fn(async (signal: AbortSignal) => {
      // Verify signal starts as not aborted
      expect(signal.aborted).toBe(false);
      return 'done';
    });

    const result = await fetchWithTimeout(fn, 10_000);
    expect(result).toBe('done');
  });
});

// ============================================================================
// fetchWithRetry — CAN-STATE-008: timed-out SDK work must not be retried
// ============================================================================

describe('fetchWithRetry (CAN-STATE-008 — no overlapping SDK work)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('returns a local timeout without retrying while opaque SDK work remains pending', async () => {
    vi.useFakeTimers();

    // Model the opaque Logto SDK: getLogtoContext ignores the AbortSignal and
    // only settles when we manually invoke its resolver. fetchWithTimeout's
    // 10s timer fires the local timeout race, but the underlying SDK promise
    // keeps running until we call resolvers[callId].
    const startOrder: number[] = [];
    const settleOrder: number[] = [];
    let callCount = 0;
    const resolvers: Array<(v: string) => void> = [];

    const fn = (_signal: AbortSignal): Promise<string> => {
      const callId = ++callCount;
      startOrder.push(callId);
      void _signal; // SDK is opaque — it does not consume the abort signal.
      return new Promise<string>((resolve) => {
        resolvers[callId] = (v: string) => {
          settleOrder.push(callId);
          resolve(v);
        };
      });
    };

    const retryPromise = fetchWithRetry<string>(fn, 3);
    const rejection = retryPromise.catch((err: unknown) => err);

    // Flush the synchronous portion: attempt 0 starts call 1.
    await vi.advanceTimersByTimeAsync(0);
    expect(callCount).toBe(1);
    expect(startOrder).toEqual([1]);
    expect(settleOrder).toEqual([]); // SDK call 1 still in flight

    // Advance past the 10s local timeout. The caller's race rejects with
    // 'Request timed out'; call 1 (opaque) is still pending.
    await vi.advanceTimersByTimeAsync(10_000);

    // Without the fix, the 500ms backoff (i=0) would now elapse and call 2
    // would start immediately — overlapping call 1. The safe behavior is to
    // return the local timeout and not start a second SDK client.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(callCount).toBe(1); // CAN-STATE-008: no overlap
    expect(settleOrder).toEqual([]); // call 1 still in flight
    await expect(rejection).resolves.toMatchObject({ message: 'Request timed out' });

    // The original SDK promise remains live even though the local caller has
    // failed. Its later settlement must not trigger a retry.
    resolvers[1]('result-1');
    await vi.advanceTimersByTimeAsync(0);
    expect(settleOrder).toEqual([1]);
    expect(callCount).toBe(1);
    expect(startOrder).toEqual([1]);

    vi.useRealTimers();
  });

  it('returns the local timeout instead of waiting forever for opaque SDK work', async () => {
    vi.useFakeTimers();

    // An AbortSignal alone is not proof that an opaque SDK call was cancelled.
    // It remains pending here, so retrying would overlap refresh work. The
    // caller must receive the local timeout rather than waiting indefinitely
    // for a settlement that may never occur.
    const fn = vi.fn((_signal: AbortSignal): Promise<string> => new Promise<string>(() => {}));
    const retryPromise = fetchWithRetry(fn, 3);
    let outcome: unknown;
    void retryPromise.then(
      () => { outcome = 'resolved'; },
      (err: unknown) => { outcome = err; },
    );

    try {
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(0);

      expect(outcome).toBeInstanceOf(Error);
      expect((outcome as Error).message).toBe('Request timed out');
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries and succeeds when the second attempt resolves before its timeout', async () => {
    // No timers needed: fn settles quickly each attempt. The first attempt
    // throws a transient, settled error; the second resolves.
    let call = 0;
    const fn = vi.fn(async (_signal: AbortSignal): Promise<string> => {
      call += 1;
      if (call === 1) {
        throw new Error('fetch failed'); // transient + already settled
      }
      return 'ok';
    });

    const result = await fetchWithRetry(fn, 3);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on auth errors (breaks immediately, re-throws)', async () => {
    const authErr = new Error('needsAuth');
    authErr.name = 'AuthError';
    const fn = vi.fn(async (_signal: AbortSignal): Promise<string> => {
      throw authErr;
    });

    await expect(fetchWithRetry(fn, 3)).rejects.toThrow('needsAuth');
    expect(fn).toHaveBeenCalledTimes(1); // auth errors never retry
  });

  it('gives up after MAX_RETRIES on settled transient errors', async () => {
    const fn = vi.fn(async (_signal: AbortSignal): Promise<string> => {
      throw new Error('fetch failed'); // transient + settled every time
    });

    await expect(fetchWithRetry(fn, 3)).rejects.toThrow('fetch failed');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ============================================================================
// fetchDashboardDataCore — auth-error / needsAuth paths (CAN-STATE-008 regression)
// ============================================================================

describe('fetchDashboardDataCore (auth-error / needsAuth paths)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockGetLogtoContext.mockReset();
  });

  it('returns needsAuth when claims.sub is missing (anonymous session)', async () => {
    mockGetLogtoContext.mockResolvedValueOnce({ claims: null, userInfo: null });

    const result = await fetchDashboardDataCore();

    expect(result).toEqual({ success: false, needsAuth: true });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns needsAuth (tolerated) on auth error when tolerateAuthErrors is true', async () => {
    const authErr = new Error('needsAuth');
    authErr.name = 'AuthError';
    mockGetLogtoContext.mockRejectedValueOnce(authErr);

    const result = await fetchDashboardDataCore({ tolerateAuthErrors: true });

    expect(result).toEqual({ success: false, needsAuth: true });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to sign-in on auth error when not tolerating', async () => {
    const authErr = new Error('needsAuth');
    authErr.name = 'AuthError';
    mockGetLogtoContext.mockRejectedValueOnce(authErr);

    await fetchDashboardDataCore();

    expect(redirect).toHaveBeenCalledWith('/api/auth/sign-in');
  });

  it('returns FETCH_FAILED on a non-auth, non-transient error', async () => {
    mockGetLogtoContext.mockRejectedValueOnce(new Error('something unexpected broke'));

    const result = await fetchDashboardDataCore();

    expect(result).toEqual({ success: false, error: 'FETCH_FAILED' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns UserData on success and never exposes tokens', async () => {
    mockGetLogtoContext.mockResolvedValueOnce({
      claims: { sub: 'user-123' },
      userInfo: {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        custom_data: {},
        identities: {},
        organizations: [],
        organization_roles: [],
      },
    });

    const result = await fetchDashboardDataCore();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.userData.id).toBe('user-123');
      expect(result.userData.name).toBe('Test User');
      // Token containment: no access/refresh/M2M/ID tokens leak to the client.
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('m2mToken');
      expect(result).not.toHaveProperty('idToken');
      expect(result.userData).not.toHaveProperty('accessToken');
    }
  });
});
