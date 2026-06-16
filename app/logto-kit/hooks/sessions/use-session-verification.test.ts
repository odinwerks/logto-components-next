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
});
