import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePasswordChangeFlow } from './use-password-change-flow';
import type { UsePasswordChangeFlowOptions } from './use-password-change-flow';

const VERIFY_OK = {
  ok: true as const,
  data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 },
};
const VERIFY_FAIL = { ok: false as const, error: 'WRONG_PASSWORD' };
const UPDATE_OK = { ok: true as const };
const UPDATE_FAIL = { ok: false as const, error: 'UPDATE_FAILED' };

const makeT = () => ({
  mfa: {
    verifying: 'Verifying...',
    changingPassword: 'Changing password...',
  },
  security: {
    passwordChanged: 'Password changed successfully',
  },
});

const makeOpts = (overrides?: Partial<UsePasswordChangeFlowOptions>): UsePasswordChangeFlowOptions => ({
  onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_OK),
  onUpdatePassword: vi.fn().mockResolvedValue(UPDATE_OK),
  onSuccess: vi.fn(),
  onError: vi.fn(),
  t: makeT(),
  ...overrides,
});

describe('usePasswordChangeFlow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. starts with null step', () => {
    const { result } = renderHook(() => usePasswordChangeFlow(makeOpts()));
    expect(result.current.step).toBeNull();
    expect(result.current.error).toBe('');
    expect(result.current.identityToken).toBeNull();
  });

  it('2. open() sets step to password', () => {
    const { result } = renderHook(() => usePasswordChangeFlow(makeOpts()));
    act(() => { result.current.open(); });
    expect(result.current.step).toBe('password');
  });

  it('3. close() resets step and token', () => {
    const { result } = renderHook(() => usePasswordChangeFlow(makeOpts()));
    act(() => { result.current.open(); });
    act(() => { result.current.close(); });
    expect(result.current.step).toBeNull();
    expect(result.current.error).toBe('');
    expect(result.current.identityToken).toBeNull();
  });

  it('4. handleCurrentPassword success sets identityToken and step=new-password', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePasswordChangeFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => {
      await result.current.handleCurrentPassword('correct-password');
    });

    expect(result.current.step).toBe('new-password');
    expect(result.current.identityToken).toEqual({
      verificationRecordId: 'vid-1',
      verificationTimestamp: expect.any(Number),
    });
  });

  it('5. handleCurrentPassword failure sets error', async () => {
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_FAIL),
    });
    const { result } = renderHook(() => usePasswordChangeFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => {
      await result.current.handleCurrentPassword('wrong-password');
    });

    expect(result.current.error).toBe('WRONG_PASSWORD');
    expect(result.current.step).toBe('password');
    expect(result.current.identityToken).toBeNull();
  });

  it('6. handleNewPassword success calls onSuccess and closes', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePasswordChangeFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => { await result.current.handleCurrentPassword('current-pass'); });
    await act(async () => { await result.current.handleNewPassword('new-pass-123'); });

    expect(opts.onUpdatePassword).toHaveBeenCalledWith('new-pass-123', 'vid-1', expect.any(Number));
    expect(opts.onSuccess).toHaveBeenCalledWith('Password changed successfully');
    expect(result.current.step).toBeNull();
    expect(result.current.identityToken).toBeNull();
  });

  it('7. handleNewPassword failure calls onError', async () => {
    const opts = makeOpts({
      onUpdatePassword: vi.fn().mockResolvedValue(UPDATE_FAIL),
    });
    const { result } = renderHook(() => usePasswordChangeFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => { await result.current.handleCurrentPassword('current-pass'); });
    await act(async () => { await result.current.handleNewPassword('new-pass-123'); });

    expect(opts.onError).toHaveBeenCalledWith('UPDATE_FAILED');
    expect(result.current.step).toBeNull();
  });

  it('8. stale generation guard', async () => {
    let resolveVerify!: (v: unknown) => void;
    const pendingVerify = new Promise((res) => { resolveVerify = res; });
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockReturnValue(pendingVerify),
    });
    const { result } = renderHook(() => usePasswordChangeFlow(opts));
    act(() => { result.current.open(); });

    const verifyPromise = act(async () => {
      void result.current.handleCurrentPassword('password');
    });

    // Close (bumps gen) before verify resolves
    act(() => { result.current.close(); });

    resolveVerify(VERIFY_OK);
    await verifyPromise;

    // Guard prevented state update
    expect(result.current.step).toBeNull();
    expect(result.current.identityToken).toBeNull();
  });
});
