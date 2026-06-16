import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTotpFlow } from './use-totp-flow';
import type { UseTotpFlowOptions } from './use-totp-flow';
import type { MfaVerification, UserData } from '../../logic/types';

const VERIFY_OK = { ok: true as const, data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 } };
const VERIFY_FAIL = { ok: false as const, error: 'WRONG_PASSWORD' };
const SECRET_OK = { ok: true as const, data: { secret: 'ABCDEF123456' } };
const ACTION_OK = { ok: true as const };

const makeUserData = (): UserData => ({
  id: 'user-1',
  username: 'testuser',
  profile: { givenName: 'Test', familyName: 'User' },
  customData: {},
  identities: {},
});

const makeTotpFactor = (): MfaVerification => ({
  id: 'totp-factor-1',
  type: 'Totp',
  createdAt: '2024-01-01T00:00:00.000Z',
});

const makeT = () => ({
  mfa: {
    verifying: 'Verifying...',
    generatingSecret: 'Generating secret...',
    activating: 'Activating...',
    factorRemoved: 'Factor removed',
    totpEnrolled: 'TOTP enrolled',
    removing: 'Removing...',
  },
  security: {},
});

const makeOpts = (overrides?: Partial<UseTotpFlowOptions>): UseTotpFlowOptions => ({
  userData: makeUserData(),
  totpFactor: undefined,
  onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_OK),
  onGenerateTotpSecret: vi.fn().mockResolvedValue(SECRET_OK),
  onAddMfaVerification: vi.fn().mockResolvedValue(ACTION_OK),
  onDeleteMfaVerification: vi.fn().mockResolvedValue(ACTION_OK),
  onReplaceTotpVerification: vi.fn().mockResolvedValue(ACTION_OK),
  onSuccess: vi.fn(),
  onError: vi.fn(),
  onRefreshMfa: vi.fn().mockResolvedValue(undefined),
  t: makeT(),
  ...overrides,
});

describe('useTotpFlow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. starts with null step', () => {
    const { result } = renderHook(() => useTotpFlow(makeOpts()));
    expect(result.current.step).toBeNull();
    expect(result.current.mode).toBe('setup');
    expect(result.current.error).toBe('');
  });

  it('2. open() sets step to password', () => {
    const { result } = renderHook(() => useTotpFlow(makeOpts()));
    act(() => {
      result.current.open();
    });
    expect(result.current.step).toBe('password');
  });

  it('3. close() resets to null', () => {
    const { result } = renderHook(() => useTotpFlow(makeOpts()));
    act(() => { result.current.open(); });
    act(() => { result.current.close(); });
    expect(result.current.step).toBeNull();
    expect(result.current.error).toBe('');
  });

  it('4. switchToRemove() changes mode to remove', () => {
    const { result } = renderHook(() => useTotpFlow(makeOpts()));
    act(() => {
      result.current.switchToRemove();
    });
    expect(result.current.mode).toBe('remove');
  });

  it('5. handlePassword verifies + generates secret in setup mode', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => useTotpFlow(opts));
    act(() => { result.current.open('setup'); });

    await act(async () => {
      await result.current.handlePassword('correct-password');
    });

    expect(opts.onVerifyPassword).toHaveBeenCalledWith('correct-password');
    expect(opts.onGenerateTotpSecret).toHaveBeenCalled();
    expect(result.current.step).toBe('setup');
    expect(result.current.secret).toBe('ABCDEF123456');
    expect(result.current.totpUri).toContain('ABCDEF123456');
  });

  it('6. handlePassword fails with error on verify failure', async () => {
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_FAIL),
    });
    const { result } = renderHook(() => useTotpFlow(opts));
    act(() => { result.current.open(); });

    await act(async () => {
      await result.current.handlePassword('wrong-password');
    });

    expect(result.current.error).toBe('WRONG_PASSWORD');
    expect(result.current.step).toBe('password');
    expect(opts.onGenerateTotpSecret).not.toHaveBeenCalled();
  });

  it('7. handlePassword in remove mode calls deleteMfaVerification', async () => {
    const totpFactor = makeTotpFactor();
    const opts = makeOpts({ totpFactor });
    const { result } = renderHook(() => useTotpFlow(opts));
    act(() => { result.current.open('remove'); });

    await act(async () => {
      await result.current.handlePassword('correct-password');
    });

    expect(opts.onDeleteMfaVerification).toHaveBeenCalledWith(
      'totp-factor-1',
      'vid-1',
      expect.any(Number),
    );
    expect(result.current.step).toBeNull();
    expect(opts.onRefreshMfa).toHaveBeenCalled();
    expect(opts.onSuccess).toHaveBeenCalledWith('Factor removed');
  });

  it('8. handlePassword stale generation guard works (open then immediately close)', async () => {
    let resolveVerify!: (v: unknown) => void;
    const pendingVerify = new Promise((res) => { resolveVerify = res; });
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockReturnValue(pendingVerify),
    });
    const { result } = renderHook(() => useTotpFlow(opts));
    act(() => { result.current.open(); });

    const passwordPromise = act(async () => {
      void result.current.handlePassword('password');
    });

    // Close (bumps generation) before verify resolves
    act(() => { result.current.close(); });

    // Resolve the verify
    resolveVerify(VERIFY_OK);
    await passwordPromise;

    // Should remain closed / null (guard prevented state update)
    expect(result.current.step).toBeNull();
    expect(opts.onGenerateTotpSecret).not.toHaveBeenCalled();
  });

  it('9. handleActivate calls addMfaVerification when no existing factor', async () => {
    const opts = makeOpts({ totpFactor: undefined });
    const { result } = renderHook(() => useTotpFlow(opts));
    act(() => { result.current.open('setup'); });

    // Go through password step to get to setup
    await act(async () => {
      await result.current.handlePassword('password');
    });

    await act(async () => {
      await result.current.handleActivate('123456');
    });

    expect(opts.onAddMfaVerification).toHaveBeenCalledWith(
      { type: 'Totp', payload: { code: '123456', secret: 'ABCDEF123456' } },
      'vid-1',
      expect.any(Number),
    );
    expect(opts.onReplaceTotpVerification).not.toHaveBeenCalled();
  });

  it('10. handleActivate calls replaceTotpVerification when factor exists', async () => {
    const totpFactor = makeTotpFactor();
    const opts = makeOpts({ totpFactor });
    const { result } = renderHook(() => useTotpFlow(opts));
    act(() => { result.current.open('setup'); });

    await act(async () => {
      await result.current.handlePassword('password');
    });

    await act(async () => {
      await result.current.handleActivate('654321');
    });

    expect(opts.onReplaceTotpVerification).toHaveBeenCalledWith(
      'ABCDEF123456',
      '654321',
      'vid-1',
      expect.any(Number),
    );
    expect(opts.onAddMfaVerification).not.toHaveBeenCalled();
  });

  it('11. handleActivate calls onSuccess + refreshMfa', async () => {
    const opts = makeOpts({ totpFactor: undefined });
    const { result } = renderHook(() => useTotpFlow(opts));
    act(() => { result.current.open('setup'); });

    await act(async () => { await result.current.handlePassword('password'); });
    await act(async () => { await result.current.handleActivate('123456'); });

    expect(opts.onSuccess).toHaveBeenCalledWith('TOTP enrolled');
    expect(opts.onRefreshMfa).toHaveBeenCalled();
    expect(result.current.step).toBeNull();
  });

  it('12. handleActivate on stale gen does nothing', async () => {
    const opts = makeOpts({ totpFactor: undefined });
    const { result } = renderHook(() => useTotpFlow(opts));
    act(() => { result.current.open('setup'); });

    await act(async () => { await result.current.handlePassword('password'); });

    let resolveAdd!: (v: unknown) => void;
    const pendingAdd = new Promise((res) => { resolveAdd = res; });
    opts.onAddMfaVerification = vi.fn().mockReturnValue(pendingAdd);

    const activatePromise = act(async () => {
      void result.current.handleActivate('123456');
    });

    // Close before add resolves
    act(() => { result.current.close(); });

    resolveAdd(ACTION_OK);
    await activatePromise;

    expect(opts.onSuccess).not.toHaveBeenCalled();
  });
});
