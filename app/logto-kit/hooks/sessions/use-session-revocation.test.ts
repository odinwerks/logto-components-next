import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionRevocation } from './use-session-revocation';
import type { UseSessionRevocationOptions } from './use-session-revocation';

const NOW = Date.now();
const FUTURE_EXPIRY = NOW + 600_000;

const makeOpts = (overrides?: Partial<UseSessionRevocationOptions>): UseSessionRevocationOptions => ({
  verificationRecordId: 'vid-1',
  verificationExpiry: FUTURE_EXPIRY,
  onVerifyPassword: vi.fn().mockResolvedValue({
    ok: true,
    data: { verificationRecordId: 'vid-fresh', verificationTimestamp: FUTURE_EXPIRY + 600_000 },
  }),
  onRevokeSession: vi.fn().mockResolvedValue({ ok: true }),
  onRevokeAllOtherSessions: vi.fn().mockResolvedValue({ ok: true }),
  onReloadSessions: vi.fn().mockResolvedValue(undefined),
  onSuccess: vi.fn(),
  onError: vi.fn(),
  ...overrides,
});

describe('useSessionRevocation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('1. startRevoke: opens password modal, sets revokingId', () => {
    const { result } = renderHook(() => useSessionRevocation(makeOpts()));

    act(() => {
      result.current.startRevoke('session-1');
    });

    expect(result.current.revokingId).toBe('session-1');
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });
    expect(result.current.revokeError).toBe('');
    expect(result.current.revokeLoading).toBe(false);
  });

  it('2. startRevoke guard: does nothing if another revocation in flight', () => {
    const { result } = renderHook(() => useSessionRevocation(makeOpts()));

    act(() => {
      result.current.startRevoke('session-1');
    });
    expect(result.current.revokingId).toBe('session-1');

    // Try to start another revocation
    act(() => {
      result.current.startRevoke('session-2');
    });

    // Should still be session-1, not overwritten
    expect(result.current.revokingId).toBe('session-1');
  });

  it('3. handleRevokePassword success single: calls onSuccess, clears modal, revokingId null', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-1');
    });

    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(opts.onSuccess).toHaveBeenCalledWith('Session revoked successfully');
    expect(result.current.revokeModalStep).toBeNull();
    expect(result.current.revokingId).toBeNull();
    expect(result.current.revokeLoading).toBe(false);
    expect(opts.onRevokeSession).toHaveBeenCalledWith('session-1', 'vid-1', 'firstParty');
  });

  it('4. handleRevokePassword single failure: revokeError set, revokingId null in finally (Bug LOG-003)', async () => {
    const opts = makeOpts({
      onRevokeSession: vi.fn().mockResolvedValue({ ok: false, error: 'REVOKE_FAILED' }),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-1');
    });

    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(result.current.revokeError).toBe('REVOKE_FAILED');
    // Bug LOG-003: revokingId should be null even on failure (finally block)
    expect(result.current.revokingId).toBeNull();
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });
    expect(result.current.revokeLoading).toBe(false);
  });

  it('5. handleRevokePassword retry: onRevokeSession receives correct sessionId on retry after failure (Bug 1)', async () => {
    let callCount = 0;
    const opts = makeOpts({
      onRevokeSession: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { ok: false, error: 'REVOKE_FAILED' };
        return { ok: true };
      }),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-target');
    });

    // First attempt fails
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });
    expect(result.current.revokeError).toBe('REVOKE_FAILED');

    // Retry: target should still be 'session-target' (revokeTargetRef not reset on failure)
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(opts.onRevokeSession).toHaveBeenCalledTimes(2);
    // Both calls should use the same session ID
    const [firstCall, secondCall] = (opts.onRevokeSession as ReturnType<typeof vi.fn>).mock.calls;
    expect(firstCall[0]).toBe('session-target');
    expect(secondCall[0]).toBe('session-target');
  });

  it('6. confirmGcAll: sets revokeTargetRef to all, opens password modal', () => {
    const { result } = renderHook(() => useSessionRevocation(makeOpts()));

    act(() => {
      result.current.openGcAllModal();
    });
    expect(result.current.showGcAllModal).toBe(true);

    act(() => {
      result.current.confirmGcAll();
    });

    expect(result.current.showGcAllModal).toBe(false);
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });
  });

  it('7. cancelRevoke: clears all state', () => {
    const { result } = renderHook(() => useSessionRevocation(makeOpts()));

    act(() => {
      result.current.startRevoke('session-1');
    });
    expect(result.current.revokingId).toBe('session-1');

    act(() => {
      result.current.cancelRevoke();
    });

    expect(result.current.revokeModalStep).toBeNull();
    expect(result.current.revokingId).toBeNull();
    expect(result.current.revokeError).toBe('');
  });

  it('8. handleRevokePassword with null target: early return, no crash', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useSessionRevocation(opts));

    // Do NOT call startRevoke — revokeTargetRef.current is null
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(opts.onRevokeSession).not.toHaveBeenCalled();
    expect(opts.onRevokeAllOtherSessions).not.toHaveBeenCalled();
  });

  it('9. handleRevokePassword all success: onSuccess called, revokingAll false after', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.openGcAllModal();
      result.current.confirmGcAll();
    });

    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(opts.onSuccess).toHaveBeenCalledWith('Session revoked successfully');
    expect(result.current.revokingAll).toBe(false);
    expect(result.current.revokeModalStep).toBeNull();
    expect(opts.onRevokeAllOtherSessions).toHaveBeenCalledWith('vid-1');
  });

  it('11. gcAllLoading is true while revoking all sessions (BUG-M20)', async () => {
    let resolveRevoke: (val: { ok: boolean }) => void = () => {};
    const revokePromise = new Promise<{ ok: boolean }>((resolve) => {
      resolveRevoke = resolve;
    });
    const opts = makeOpts({
      onRevokeAllOtherSessions: vi.fn().mockReturnValue(revokePromise),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.openGcAllModal();
      result.current.confirmGcAll();
    });

    // gcAllLoading starts false
    expect(result.current.gcAllLoading).toBe(false);

    let passwordPromise: Promise<void>;
    act(() => {
      passwordPromise = result.current.handleRevokePassword('password');
    });

    // gcAllLoading is true while revoke is in flight
    expect(result.current.gcAllLoading).toBe(true);

    await act(async () => {
      resolveRevoke({ ok: true });
      await passwordPromise;
    });

    // gcAllLoading resets to false after success
    expect(result.current.gcAllLoading).toBe(false);
  });

  it('12. gcAllLoading resets to false on revoke-all failure (BUG-M20)', async () => {
    const opts = makeOpts({
      onRevokeAllOtherSessions: vi.fn().mockResolvedValue({ ok: false, error: 'REVOKE_FAILED' }),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.openGcAllModal();
      result.current.confirmGcAll();
    });

    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(result.current.gcAllLoading).toBe(false);
    expect(result.current.revokeError).toBe('REVOKE_FAILED');
  });

  it('10. closeGcAllModal: does not close modal if revokingAll is true', async () => {
    let resolveRevoke: (val: { ok: boolean }) => void = () => {};
    const revokePromise = new Promise<{ ok: boolean }>((resolve) => {
      resolveRevoke = resolve;
    });
    const opts = makeOpts({
      onRevokeAllOtherSessions: vi.fn().mockReturnValue(revokePromise),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.openGcAllModal();
      result.current.confirmGcAll();
    });

    let passwordPromise: Promise<void>;
    act(() => {
      passwordPromise = result.current.handleRevokePassword('password');
    });

    // At this point, revokingAll should be true
    expect(result.current.revokingAll).toBe(true);

    // Call openGcAllModal / closeGcAllModal
    act(() => {
      result.current.openGcAllModal(); // explicitly force showGcAllModal to be true
    });
    expect(result.current.showGcAllModal).toBe(true);

    act(() => {
      result.current.closeGcAllModal();
    });
    // Should still be true because revokingAll is true
    expect(result.current.showGcAllModal).toBe(true);

    // Clean up
    await act(async () => {
      resolveRevoke({ ok: true });
      await passwordPromise;
    });
  });

  it('13. revokeLoading is true while handleRevokePassword is in flight, false after', async () => {
    let resolveRevoke!: (val: { ok: boolean }) => void;
    const revokePromise = new Promise<{ ok: boolean }>((resolve) => {
      resolveRevoke = resolve;
    });
    const opts = makeOpts({
      onRevokeSession: vi.fn().mockReturnValue(revokePromise),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-1');
    });
    expect(result.current.revokeLoading).toBe(false);

    let passwordPromise: Promise<void>;
    act(() => {
      passwordPromise = result.current.handleRevokePassword('password');
    });

    // revokeLoading is true while revoke is in flight
    expect(result.current.revokeLoading).toBe(true);

    await act(async () => {
      resolveRevoke({ ok: true });
      await passwordPromise;
    });

    // revokeLoading resets to false after success
    expect(result.current.revokeLoading).toBe(false);
  });

  // ---- HOOK-002: dormant session-revocation hook leaves loading stuck on rejected callbacks ----

  it('14. handleRevokePassword: onVerifyPassword rejection resets revokeLoading + revokingId (HOOK-002)', async () => {
    const opts = makeOpts({
      verificationRecordId: null,
      verificationExpiry: 0,
      onVerifyPassword: vi.fn()
        .mockRejectedValueOnce(new Error('TRANSPORT_ERROR'))
        .mockResolvedValueOnce({
          ok: true,
          data: { verificationRecordId: 'vid-retry', verificationTimestamp: FUTURE_EXPIRY },
        }),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-target');
    });

    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(result.current.revokeLoading).toBe(false);
    expect(result.current.revokingId).toBeNull();
    expect(result.current.revokeError).toBe('TRANSPORT_ERROR');

    // The failed verification leaves the original target available for retry.
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });
    expect(opts.onRevokeSession).toHaveBeenCalledWith('session-target', 'vid-retry', 'firstParty');
  });

  it('15. handleRevokePassword: onRevokeAllOtherSessions rejection resets revokingAll + gcAllLoading (HOOK-002)', async () => {
    const opts = makeOpts({
      onRevokeAllOtherSessions: vi.fn()
        .mockRejectedValueOnce(new Error('TRANSPORT_ERROR'))
        .mockResolvedValueOnce({ ok: true }),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.openGcAllModal();
      result.current.confirmGcAll();
    });

    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(result.current.revokeLoading).toBe(false);
    expect(result.current.revokingAll).toBe(false);
    expect(result.current.gcAllLoading).toBe(false);
    expect(result.current.revokeError).toBe('TRANSPORT_ERROR');
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });

    // A rejected revoke-all keeps the all-target for a safe retry.
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });
    expect(opts.onRevokeAllOtherSessions).toHaveBeenCalledTimes(2);
    expect(opts.onRevokeAllOtherSessions).toHaveBeenLastCalledWith('vid-1');
  });

  it('16. handleRevokePassword: onRevokeSession rejection resets revokeLoading + revokingId (HOOK-002)', async () => {
    const opts = makeOpts({
      onRevokeSession: vi.fn().mockRejectedValue(new Error('TRANSPORT_ERROR')),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-target');
    });

    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(result.current.revokeLoading).toBe(false);
    expect(result.current.revokingId).toBeNull();
    expect(result.current.revokeError).toBe('TRANSPORT_ERROR');
    expect(opts.onRevokeSession).toHaveBeenCalledWith('session-target', 'vid-1', 'firstParty');
  });

  it('17. handleRevokePassword: onReloadSessions rejection resets loading + closes modal (HOOK-002)', async () => {
    const opts = makeOpts({
      onReloadSessions: vi.fn().mockRejectedValue(new Error('RELOAD_ERROR')),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-1');
    });

    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    // Revoke succeeded; reload failed but must not leave loading stuck
    expect(result.current.revokeLoading).toBe(false);
    expect(result.current.revokingId).toBeNull();
    expect(result.current.revokeModalStep).toBeNull();
    expect(result.current.revokeError).toBe('RELOAD_ERROR');
    expect(opts.onSuccess).toHaveBeenCalledWith('Session revoked successfully');
  });

  it('18. cancelRevoke: clears revokingAll + gcAllLoading during in-flight revoke-all (HOOK-002)', async () => {
    let resolveRevoke!: (val: { ok: boolean }) => void;
    const revokePromise = new Promise<{ ok: boolean }>((resolve) => {
      resolveRevoke = resolve;
    });
    const opts = makeOpts({
      onRevokeAllOtherSessions: vi.fn().mockReturnValue(revokePromise),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.openGcAllModal();
      result.current.confirmGcAll();
    });

    let passwordPromise: Promise<void>;
    act(() => {
      passwordPromise = result.current.handleRevokePassword('password');
    });

    // revokingAll + gcAllLoading now true (in-flight)
    expect(result.current.revokingAll).toBe(true);
    expect(result.current.gcAllLoading).toBe(true);

    // User cancels — must clear ALL flags (HOOK-002: previously left revokingAll/gcAllLoading stuck)
    act(() => {
      result.current.cancelRevoke();
    });

    expect(result.current.revokingAll).toBe(false);
    expect(result.current.gcAllLoading).toBe(false);
    expect(result.current.revokeLoading).toBe(false);
    expect(result.current.revokeModalStep).toBeNull();

    // Clean up the dangling promise
    await act(async () => {
      resolveRevoke({ ok: true });
      await passwordPromise;
    });
  });

  it('19. handleRevokePassword: target retained for retry after onRevokeSession rejection (HOOK-002)', async () => {
    let callCount = 0;
    const opts = makeOpts({
      onRevokeSession: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw new Error('TRANSPORT_ERROR');
        return { ok: true };
      }),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-target');
    });

    // First attempt: rejection — must not leave loading stuck
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });
    expect(result.current.revokeError).toBe('TRANSPORT_ERROR');
    expect(result.current.revokeLoading).toBe(false);

    // Retry: target retained → onRevokeSession called again with same id
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(opts.onRevokeSession).toHaveBeenCalledTimes(2);
    const [, secondCall] = (opts.onRevokeSession as ReturnType<typeof vi.fn>).mock.calls;
    expect(secondCall[0]).toBe('session-target');
  });

  it('20. cancelRevoke: a cancelled rejection cannot clear a new revoke target (HOOK-002)', async () => {
    let rejectFirstRevoke!: (reason?: unknown) => void;
    const firstRevoke = new Promise<{ ok: boolean }>((_resolve, reject) => {
      rejectFirstRevoke = reject;
    });
    const opts = makeOpts({
      onRevokeSession: vi.fn().mockReturnValueOnce(firstRevoke),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('cancelled-session');
    });
    let cancelledAttempt: Promise<void>;
    act(() => {
      cancelledAttempt = result.current.handleRevokePassword('password');
    });

    act(() => {
      result.current.cancelRevoke();
    });
    act(() => {
      result.current.startRevoke('new-session');
    });
    expect(result.current.revokingId).toBe('new-session');
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });

    await act(async () => {
      rejectFirstRevoke(new Error('CANCELLED_REQUEST_REJECTED'));
      await cancelledAttempt;
    });

    // The stale callback must not report an error or tear down the new retry target.
    expect(result.current.revokeError).toBe('');
    expect(result.current.revokeLoading).toBe(false);
    expect(result.current.revokingId).toBe('new-session');
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });
  });

  it('21. cancelRevoke: blocks a same-target retry until the cancelled revoke request settles (HOOK-002)', async () => {
    let resolveFirstRevoke!: (value: { ok: boolean }) => void;
    const firstRevoke = new Promise<{ ok: boolean }>((resolve) => {
      resolveFirstRevoke = resolve;
    });
    const opts = makeOpts({
      onRevokeSession: vi.fn()
        .mockReturnValueOnce(firstRevoke)
        .mockResolvedValueOnce({ ok: true }),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('session-target');
    });
    let cancelledAttempt!: Promise<void>;
    act(() => {
      cancelledAttempt = result.current.handleRevokePassword('password');
    });
    expect(opts.onRevokeSession).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.cancelRevoke();
    });
    act(() => {
      result.current.startRevoke('session-target');
    });
    expect(result.current.revokingId).toBe('session-target');
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });

    // The cancelled network operation is still pending, so this submit must
    // not send a duplicate destructive request.
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });
    expect(opts.onRevokeSession).toHaveBeenCalledTimes(1);
    expect(result.current.revokingId).toBe('session-target');
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });

    await act(async () => {
      resolveFirstRevoke({ ok: true });
      await cancelledAttempt;
    });
    // The stale success does not close or otherwise mutate the new flow.
    expect(result.current.revokingId).toBe('session-target');
    expect(result.current.revokeModalStep).toEqual({ kind: 'password' });
    expect(opts.onSuccess).not.toHaveBeenCalled();

    // After the original request settles, a same-target retry is allowed.
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });
    expect(opts.onRevokeSession).toHaveBeenCalledTimes(2);
    expect(result.current.revokeModalStep).toBeNull();
  });

  it('22. cancelRevoke: permits a different target while the cancelled request is pending (HOOK-002)', async () => {
    let resolveFirstRevoke!: (value: { ok: boolean }) => void;
    const firstRevoke = new Promise<{ ok: boolean }>((resolve) => {
      resolveFirstRevoke = resolve;
    });
    const opts = makeOpts({
      onRevokeSession: vi.fn()
        .mockReturnValueOnce(firstRevoke)
        .mockResolvedValueOnce({ ok: true }),
    });
    const { result } = renderHook(() => useSessionRevocation(opts));

    act(() => {
      result.current.startRevoke('first-session');
    });
    let cancelledAttempt!: Promise<void>;
    act(() => {
      cancelledAttempt = result.current.handleRevokePassword('password');
    });

    act(() => {
      result.current.cancelRevoke();
    });
    act(() => {
      result.current.startRevoke('second-session');
    });
    await act(async () => {
      await result.current.handleRevokePassword('password');
    });

    expect(opts.onRevokeSession).toHaveBeenCalledTimes(2);
    expect(opts.onRevokeSession).toHaveBeenLastCalledWith('second-session', 'vid-1', 'firstParty');
    expect(result.current.revokeModalStep).toBeNull();

    await act(async () => {
      resolveFirstRevoke({ ok: true });
      await cancelledAttempt;
    });
    expect(opts.onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.revokeModalStep).toBeNull();
  });
});
