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

import { _internals } from './dashboard-data';

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
