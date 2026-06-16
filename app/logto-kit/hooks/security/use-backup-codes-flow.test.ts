import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackupCodesFlow } from './use-backup-codes-flow';
import type { UseBackupCodesFlowOptions } from './use-backup-codes-flow';

const VERIFY_OK = {
  ok: true as const,
  data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 },
};
const VERIFY_FAIL = { ok: false as const, error: 'WRONG_PASSWORD' };
const CODES_OK = { ok: true as const, data: { codes: ['AAAA-1111', 'BBBB-2222', 'CCCC-3333'] } };
const CODES_FAIL = { ok: false as const, error: 'GENERATION_FAILED' };

const makeT = () => ({
  mfa: {
    generatingCodes: 'Generating codes...',
  },
  security: {},
});

const makeOpts = (overrides?: Partial<UseBackupCodesFlowOptions>): UseBackupCodesFlowOptions => ({
  onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_OK),
  onGenerateBackupCodes: vi.fn().mockResolvedValue(CODES_OK),
  onSuccess: vi.fn(),
  onError: vi.fn(),
  onRefreshMfa: vi.fn().mockResolvedValue(undefined),
  t: makeT(),
  ...overrides,
});

describe('useBackupCodesFlow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. starts with null step and no codes', () => {
    const { result } = renderHook(() => useBackupCodesFlow(makeOpts()));
    expect(result.current.step).toBeNull();
    expect(result.current.generatedCodes).toBeNull();
    expect(result.current.error).toBe('');
  });

  it('2. open() sets step to confirm', () => {
    const { result } = renderHook(() => useBackupCodesFlow(makeOpts()));
    act(() => { result.current.open(); });
    expect(result.current.step).toBe('confirm');
  });

  it('3. proceedToPassword() transitions to password', () => {
    const { result } = renderHook(() => useBackupCodesFlow(makeOpts()));
    act(() => { result.current.open(); });
    act(() => { result.current.proceedToPassword(); });
    expect(result.current.step).toBe('password');
  });

  it('4. handlePassword success sets generatedCodes', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useBackupCodesFlow(opts));
    act(() => { result.current.open(); });
    act(() => { result.current.proceedToPassword(); });

    await act(async () => {
      await result.current.handlePassword('password');
    });

    expect(result.current.generatedCodes).toEqual([
      { code: 'AAAA-1111', used: false },
      { code: 'BBBB-2222', used: false },
      { code: 'CCCC-3333', used: false },
    ]);
    expect(result.current.step).toBeNull();
  });

  it('5. handlePassword verify failure shows error', async () => {
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_FAIL),
    });
    const { result } = renderHook(() => useBackupCodesFlow(opts));
    act(() => { result.current.open(); });
    act(() => { result.current.proceedToPassword(); });

    await act(async () => {
      await result.current.handlePassword('wrong-password');
    });

    expect(result.current.error).toBe('WRONG_PASSWORD');
    expect(result.current.step).toBe('password');
    expect(result.current.generatedCodes).toBeNull();
  });

  it('6. handlePassword generate failure calls onError', async () => {
    const opts = makeOpts({
      onGenerateBackupCodes: vi.fn().mockResolvedValue(CODES_FAIL),
    });
    const { result } = renderHook(() => useBackupCodesFlow(opts));
    act(() => { result.current.open(); });
    act(() => { result.current.proceedToPassword(); });

    await act(async () => {
      await result.current.handlePassword('password');
    });

    expect(opts.onError).toHaveBeenCalledWith('GENERATION_FAILED');
    expect(result.current.step).toBeNull();
    expect(result.current.generatedCodes).toBeNull();
  });

  it('7. dismissCodes clears codes and calls refreshMfa', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useBackupCodesFlow(opts));
    act(() => { result.current.open(); });
    act(() => { result.current.proceedToPassword(); });

    await act(async () => { await result.current.handlePassword('password'); });
    expect(result.current.generatedCodes).not.toBeNull();

    await act(async () => {
      await result.current.dismissCodes();
    });

    expect(result.current.generatedCodes).toBeNull();
    expect(opts.onRefreshMfa).toHaveBeenCalled();
  });

  it('8. stale generation guard on handlePassword', async () => {
    let resolveVerify!: (v: unknown) => void;
    const pendingVerify = new Promise((res) => { resolveVerify = res; });
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockReturnValue(pendingVerify),
    });
    const { result } = renderHook(() => useBackupCodesFlow(opts));
    act(() => { result.current.open(); });
    act(() => { result.current.proceedToPassword(); });

    const pwPromise = act(async () => {
      void result.current.handlePassword('password');
    });

    // Close modal (bumps generation)
    act(() => { result.current.close(); });

    resolveVerify(VERIFY_OK);
    await pwPromise;

    // Stale guard — no side effects
    expect(opts.onGenerateBackupCodes).not.toHaveBeenCalled();
    expect(result.current.generatedCodes).toBeNull();
  });
});
