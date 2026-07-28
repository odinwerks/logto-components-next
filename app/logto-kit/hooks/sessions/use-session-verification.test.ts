import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionVerification } from './use-session-verification';
import type { UseSessionVerificationOptions } from './use-session-verification';
import type { LogtoSession } from '../../logic/types';

const makeSessions = (): LogtoSession[] => [
  {
    payload: {
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
      jti: 'jti-1',
      uid: 'user-1',
      kind: 'Session',
      loginTs: Date.now() / 1000,
      accountId: 'acc-1',
    },
    lastSubmission: null,
    clientId: null,
    accountId: 'acc-1',
    expiresAt: Date.now() + 3600000,
    meta: null,
  },
];

const makeOpts = (overrides?: Partial<UseSessionVerificationOptions>): UseSessionVerificationOptions => ({
  onVerifyPassword: vi.fn().mockResolvedValue({
    ok: true,
    data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 },
  }),
  onGetSessions: vi.fn().mockResolvedValue({ ok: true, data: makeSessions() }),
  onError: vi.fn(),
  ...overrides,
});

describe('useSessionVerification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('1. initial state', () => {
    const { result } = renderHook(() => useSessionVerification(makeOpts()));

    expect(result.current.viewState).toBe('unverified');
    expect(result.current.sessions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.verificationRecordId).toBeNull();
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.verificationError).toBe('');
  });

  it('2. verifyAndLoad success', async () => {
    const sessions = makeSessions();
    const opts = makeOpts({
      onGetSessions: vi.fn().mockResolvedValue({ ok: true, data: sessions }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });

    expect(result.current.viewState).toBe('loaded');
    expect(result.current.sessions).toEqual(sessions);
    expect(result.current.loading).toBe(false);
    expect(result.current.verificationRecordId).toBe('vid-1');
  });

  it('3. verifyAndLoad password failure: verificationError set, viewState stays unverified', async () => {
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockResolvedValue({ ok: false, error: 'WRONG_PASSWORD' }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      await result.current.verifyAndLoad('bad-password');
    });

    expect(result.current.verificationError).toBe('WRONG_PASSWORD');
    expect(result.current.viewState).toBe('unverified');
    expect(result.current.loading).toBe(false);
  });

  it('4. verifyAndLoad sessions fetch failure: viewState stays unverified (Bug 2 regression)', async () => {
    const opts = makeOpts({
      onGetSessions: vi.fn().mockResolvedValue({ ok: false, error: 'FETCH_FAILED' }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });

    expect(result.current.viewState).toBe('unverified');
    expect(result.current.verificationRecordId).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(opts.onError).toHaveBeenCalledWith('FETCH_FAILED');
  });

  it('5. loadSessions no-op when not verified', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useSessionVerification(opts));

    // Should be a no-op since verificationRecordId is null
    await act(async () => {
      await result.current.loadSessions();
    });

    expect(opts.onGetSessions).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('6. loadSessions transient error: viewState stays loaded, onError called (Bug 3 test)', async () => {
    const sessions = makeSessions();
    let callCount = 0;
    const opts = makeOpts({
      onGetSessions: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { ok: true, data: sessions };
        return { ok: false, error: 'NETWORK_ERROR' };
      }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    // First load succeeds
    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });
    expect(result.current.viewState).toBe('loaded');

    // Second load fails with non-auth error
    await act(async () => {
      await result.current.loadSessions();
    });

    expect(result.current.viewState).toBe('loaded');
    expect(opts.onError).toHaveBeenCalledWith('NETWORK_ERROR');
  });

  it('7. loadSessions VERIFICATION_FAILED: viewState becomes unverified (Bug 3 test)', async () => {
    const sessions = makeSessions();
    let callCount = 0;
    const opts = makeOpts({
      onGetSessions: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { ok: true, data: sessions };
        return { ok: false, error: 'VERIFICATION_FAILED' };
      }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });
    expect(result.current.viewState).toBe('loaded');

    await act(async () => {
      await result.current.loadSessions();
    });

    expect(result.current.viewState).toBe('unverified');
    expect(result.current.verificationRecordId).toBeNull();
  });

  it('8. loadSessions UNAUTHORIZED: viewState becomes unverified', async () => {
    const sessions = makeSessions();
    let callCount = 0;
    const opts = makeOpts({
      onGetSessions: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { ok: true, data: sessions };
        return { ok: false, error: 'UNAUTHORIZED' };
      }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });

    await act(async () => {
      await result.current.loadSessions();
    });

    expect(result.current.viewState).toBe('unverified');
    expect(result.current.verificationRecordId).toBeNull();
  });

  it('9. resetVerification clears state', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });
    expect(result.current.viewState).toBe('loaded');

    act(() => {
      result.current.resetVerification();
    });

    expect(result.current.verificationRecordId).toBeNull();
    expect(result.current.verificationExpiry).toBe(0);
    expect(result.current.viewState).toBe('unverified');
    expect(result.current.verificationError).toBe('');
  });

  it('10. auto-expiry: resets verification when expiry time passes', async () => {
    const expiry = Date.now() + 5000; // expires in 5 seconds
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'vid-1', verificationTimestamp: expiry },
      }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });
    expect(result.current.verificationRecordId).toBe('vid-1');

    // Advance time past expiry
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.verificationRecordId).toBeNull();
  });

  // HOOK-003 regression tests: loading must clear via `finally` even when a callback rejects.

  it('11. verifyAndLoad: rejected onVerifyPassword clears loading via finally (HOOK-003)', async () => {
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockRejectedValue(new Error('network failure')),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      try {
        await result.current.verifyAndLoad('password123');
      } catch {
        // expected: rejection propagates after finally runs
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('12. verifyAndLoad: rejected onGetSessions clears loading via finally (HOOK-003)', async () => {
    const opts = makeOpts({
      onGetSessions: vi.fn().mockRejectedValue(new Error('network failure')),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      try {
        await result.current.verifyAndLoad('password123');
      } catch {
        // expected: rejection propagates after finally runs
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('13. loadSessionsWith: rejected onGetSessions clears loading via finally (HOOK-003)', async () => {
    const opts = makeOpts({
      onGetSessions: vi.fn().mockRejectedValue(new Error('network failure')),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    await act(async () => {
      try {
        await result.current.loadSessionsWith('vid-1');
      } catch {
        // expected: rejection propagates after finally runs
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('14. loadSessions: rejected onGetSessions clears loading via finally (HOOK-003)', async () => {
    const sessions = makeSessions();
    let callCount = 0;
    const opts = makeOpts({
      onGetSessions: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { ok: true, data: sessions };
        throw new Error('network failure');
      }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    // First load establishes a valid verification record.
    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });
    expect(result.current.loading).toBe(false);

    // Second load: underlying onGetSessions rejects.
    await act(async () => {
      try {
        await result.current.loadSessions();
      } catch {
        // expected: rejection propagates after finally runs
      }
    });

    expect(result.current.loading).toBe(false);
  });

  it('15. resetVerification invalidates a pending verification attempt (HOOK-003)', async () => {
    // Drive loading=true by hanging verifyAndLoad on a controllable promise, then reset.
    // Its late success must not restore the record, expiry, sessions, or loaded view.
    let resolveVerify!: (v: { ok: true; data: { verificationRecordId: string; verificationTimestamp: number } }) => void;
    const pending = new Promise<{ ok: true; data: { verificationRecordId: string; verificationTimestamp: number } }>((r) => {
      resolveVerify = r;
    });
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockReturnValue(pending),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    // Kick off verifyAndLoad (hangs on the controllable promise). setLoading(true) flushes.
    let inFlight!: Promise<void>;
    act(() => {
      inFlight = result.current.verifyAndLoad('password123');
    });
    expect(result.current.loading).toBe(true);

    // resetVerification must clear loading and invalidate the in-flight attempt.
    act(() => {
      result.current.resetVerification();
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.verificationRecordId).toBeNull();
    expect(result.current.viewState).toBe('unverified');

    // A late success must leave the reset state intact.
    await act(async () => {
      resolveVerify({ ok: true, data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 } });
      await inFlight;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.verificationRecordId).toBeNull();
    expect(result.current.verificationExpiry).toBe(0);
    expect(result.current.sessions).toEqual([]);
    expect(result.current.viewState).toBe('unverified');
  });

  it('16. auto-expiry clears loading via resetVerification (HOOK-003)', async () => {
    // Set up: hold loadSessions mid-flight (loading=true) while expiry fires.
    const initialSessions = makeSessions();
    const lateSessions = makeSessions();
    lateSessions[0].payload.jti = 'late-jti';
    let resolveGet!: () => void;
    const hangGet = new Promise<{ ok: true; data: LogtoSession[] }>((r) => {
      resolveGet = () => r({ ok: true, data: lateSessions });
    });
    // First onGetSessions call (verifyAndLoad) succeeds; second call (loadSessions) hangs.
    let callCount = 0;
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 5000 },
      }),
      onGetSessions: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { ok: true, data: initialSessions };
        return hangGet;
      }),
    });
    const { result } = renderHook(() => useSessionVerification(opts));

    // Successful verifyAndLoad sets expiry 5s out.
    await act(async () => {
      await result.current.verifyAndLoad('password123');
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.sessions).toEqual(initialSessions);

    // Start loadSessions — hangs on controllable promise; loading=true.
    let inFlight!: Promise<void>;
    act(() => {
      inFlight = result.current.loadSessions();
    });
    expect(result.current.loading).toBe(true);

    // Advance fake time past expiry: auto-expiry schedules resetVerification, which must clear loading.
    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.verificationRecordId).toBeNull();
    expect(result.current.loading).toBe(false);

    // A session response arriving after expiry must not alter the expired flow.
    await act(async () => {
      resolveGet();
      await inFlight;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.verificationRecordId).toBeNull();
    expect(result.current.viewState).toBe('unverified');
    expect(result.current.sessions).toEqual(initialSessions);
  });
});
