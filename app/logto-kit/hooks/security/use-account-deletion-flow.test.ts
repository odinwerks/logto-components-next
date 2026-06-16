import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccountDeletionFlow } from './use-account-deletion-flow';
import type { UseAccountDeletionFlowOptions } from './use-account-deletion-flow';

const VERIFY_OK = {
  ok: true as const,
  data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 },
};
const VERIFY_FAIL = { ok: false as const, error: 'WRONG_PASSWORD' };
const DELETE_OK = { ok: true as const };
const DELETE_FAIL = { ok: false as const, error: 'DELETE_FAILED' };

const makeT = () => ({
  mfa: {
    verifying: 'Verifying...',
  },
  security: {
    deletingAccount: 'Deleting account...',
    accountDeleted: 'Account deleted',
  },
});

const makeOpts = (
  overrides?: Partial<UseAccountDeletionFlowOptions>,
): UseAccountDeletionFlowOptions => ({
  onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_OK),
  onDeleteAccount: vi.fn().mockResolvedValue(DELETE_OK),
  onSuccess: vi.fn(),
  onError: vi.fn(),
  t: makeT(),
  ...overrides,
});

describe('useAccountDeletionFlow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. starts with null step and showFarewell=false', () => {
    const { result } = renderHook(() => useAccountDeletionFlow(makeOpts()));
    expect(result.current.step).toBeNull();
    expect(result.current.showFarewell).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('2. open() sets step=password', () => {
    const { result } = renderHook(() => useAccountDeletionFlow(makeOpts()));
    act(() => { result.current.open(); });
    expect(result.current.step).toBe('password');
  });

  it('3. close() resets step', () => {
    const { result } = renderHook(() => useAccountDeletionFlow(makeOpts()));
    act(() => { result.current.open(); });
    act(() => { result.current.close(); });
    expect(result.current.step).toBeNull();
    expect(result.current.error).toBe('');
  });

  it('4. handlePassword verify failure sets error', async () => {
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_FAIL),
    });
    const { result } = renderHook(() => useAccountDeletionFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => {
      await result.current.handlePassword('wrong-password');
    });

    expect(result.current.error).toBe('WRONG_PASSWORD');
    expect(result.current.step).toBe('password');
    expect(result.current.showFarewell).toBe(false);
  });

  it('5. handlePassword delete failure calls onError, step=null', async () => {
    const opts = makeOpts({
      onDeleteAccount: vi.fn().mockResolvedValue(DELETE_FAIL),
    });
    const { result } = renderHook(() => useAccountDeletionFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => {
      await result.current.handlePassword('correct-password');
    });

    expect(opts.onError).toHaveBeenCalledWith('DELETE_FAILED');
    expect(result.current.step).toBeNull();
    expect(result.current.showFarewell).toBe(false);
  });

  it('6. handlePassword success sets showFarewell=true', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useAccountDeletionFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => {
      await result.current.handlePassword('correct-password');
    });

    expect(opts.onVerifyPassword).toHaveBeenCalledWith('correct-password');
    expect(opts.onDeleteAccount).toHaveBeenCalledWith('vid-1', expect.any(Number));
    expect(opts.onSuccess).toHaveBeenCalledWith('Account deleted');
    expect(result.current.showFarewell).toBe(true);
    expect(result.current.step).toBeNull();
  });

  it('7. dismissFarewell clears showFarewell', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useAccountDeletionFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => { await result.current.handlePassword('correct-password'); });
    expect(result.current.showFarewell).toBe(true);

    act(() => { result.current.dismissFarewell(); });
    expect(result.current.showFarewell).toBe(false);
  });

  it('8. stale generation guard', async () => {
    let resolveVerify!: (v: unknown) => void;
    const pendingVerify = new Promise((res) => { resolveVerify = res; });
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockReturnValue(pendingVerify),
    });
    const { result } = renderHook(() => useAccountDeletionFlow(opts));
    act(() => { result.current.open(); });

    const pwPromise = act(async () => {
      void result.current.handlePassword('password');
    });

    // Close (bumps gen) before verify resolves
    act(() => { result.current.close(); });

    resolveVerify(VERIFY_OK);
    await pwPromise;

    // Guard prevented state update — no delete called
    expect(opts.onDeleteAccount).not.toHaveBeenCalled();
    expect(result.current.showFarewell).toBe(false);
  });
});
