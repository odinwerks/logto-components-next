import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePasskeysFlow } from './use-passkeys-flow';
import type { UsePasskeysFlowOptions } from './use-passkeys-flow';

// Mock @simplewebauthn/browser — factory must not use vi.fn() directly
// (Vitest hoists vi.mock but the factory values get re-evaluated)
const mockStartRegistration = vi.fn().mockResolvedValue({ id: 'cred-id', type: 'public-key' });
const mockBrowserSupportsWebAuthn = vi.fn().mockReturnValue(true);

vi.mock('@simplewebauthn/browser', () => ({
  get browserSupportsWebAuthn() { return mockBrowserSupportsWebAuthn; },
  get startRegistration() { return mockStartRegistration; },
}));

const VERIFY_OK = {
  ok: true as const,
  data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 },
};
const VERIFY_FAIL = { ok: false as const, error: 'WRONG_PASSWORD' };
const WEBAUTHN_REG_OK = {
  ok: true as const,
  data: { registrationOptions: { challenge: 'abc123' }, verificationRecordId: 'webauthn-vid-1' },
};
const ACTION_OK = { ok: true as const };
const ACTION_FAIL = { ok: false as const, error: 'ACTION_FAILED' };

const makeT = () => ({
  mfa: {
    verifying: 'Verifying...',
    checkDevice: 'Check your device...',
    linkingPasskey: 'Linking passkey...',
    passkeyAdded: 'Passkey added',
    passkeyDeleted: 'Passkey deleted',
    passkeyRenamed: 'Passkey renamed',
    removing: 'Removing...',
  },
  security: {},
});

const makeOpts = (overrides?: Partial<UsePasskeysFlowOptions>): UsePasskeysFlowOptions => ({
  onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_OK),
  onRequestWebAuthnRegistration: vi.fn().mockResolvedValue(WEBAUTHN_REG_OK),
  onVerifyAndLinkWebAuthn: vi.fn().mockResolvedValue(ACTION_OK),
  onDeleteMfaVerification: vi.fn().mockResolvedValue(ACTION_OK),
  onRenamePasskey: vi.fn().mockResolvedValue(ACTION_OK),
  onSuccess: vi.fn(),
  onError: vi.fn(),
  onRefreshMfa: vi.fn().mockResolvedValue(undefined),
  t: makeT(),
  ...overrides,
});

describe('usePasskeysFlow', () => {
  beforeEach(() => {
    // Re-set mock implementations after clearAllMocks resets them
    mockStartRegistration.mockResolvedValue({ id: 'cred-id', type: 'public-key' });
    mockBrowserSupportsWebAuthn.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. starts with all steps null and webAuthnSupported=true', async () => {
    const { result } = renderHook(() => usePasskeysFlow(makeOpts()));

    // Wait for the webAuthn detection useEffect
    await act(async () => {});

    expect(result.current.registerStep).toBeNull();
    expect(result.current.deleteStep).toBeNull();
    expect(result.current.renameStep).toBeNull();
    expect(result.current.actionStep).toBeNull();
    expect(result.current.webAuthnSupported).toBe(true);
  });

  it('2. openRegister() sets registerStep=password', () => {
    const { result } = renderHook(() => usePasskeysFlow(makeOpts()));
    act(() => { result.current.openRegister(); });
    expect(result.current.registerStep).toBe('password');
    expect(result.current.registerError).toBe('');
  });

  it('3. closeRegister() clears register state', () => {
    const { result } = renderHook(() => usePasskeysFlow(makeOpts()));
    act(() => { result.current.openRegister(); });
    act(() => { result.current.closeRegister(); });
    expect(result.current.registerStep).toBeNull();
    expect(result.current.registerError).toBe('');
  });

  it('4. handleRegisterPassword success path (mock @simplewebauthn/browser)', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePasskeysFlow(opts));
    act(() => { result.current.openRegister(); });

    await act(async () => {
      await result.current.handleRegisterPassword('password');
    });

    expect(opts.onVerifyPassword).toHaveBeenCalledWith('password');
    expect(opts.onRequestWebAuthnRegistration).toHaveBeenCalled();
    expect(opts.onVerifyAndLinkWebAuthn).toHaveBeenCalled();
    expect(opts.onSuccess).toHaveBeenCalledWith('Passkey added');
    expect(opts.onRefreshMfa).toHaveBeenCalled();
    expect(result.current.registerStep).toBeNull();
  });

  it('5. handleRegisterPassword verify failure sets error', async () => {
    const opts = makeOpts({
      onVerifyPassword: vi.fn().mockResolvedValue(VERIFY_FAIL),
    });
    const { result } = renderHook(() => usePasskeysFlow(opts));
    act(() => { result.current.openRegister(); });

    await act(async () => {
      await result.current.handleRegisterPassword('wrong-password');
    });

    expect(result.current.registerError).toBe('WRONG_PASSWORD');
    expect(result.current.registerStep).toBe('password');
    expect(opts.onRequestWebAuthnRegistration).not.toHaveBeenCalled();
  });

  it('6. handleRegisterPassword NotAllowedError closes silently', async () => {
    mockStartRegistration.mockRejectedValueOnce(
      Object.assign(new Error('Not allowed'), { name: 'NotAllowedError' }),
    );

    const opts = makeOpts();
    const { result } = renderHook(() => usePasskeysFlow(opts));
    act(() => { result.current.openRegister(); });

    await act(async () => {
      await result.current.handleRegisterPassword('password');
    });

    expect(result.current.registerStep).toBeNull();
    expect(opts.onError).not.toHaveBeenCalled();
  });

  it('7. openDelete() sets deleteStep=password and passkeyToDelete', () => {
    const { result } = renderHook(() => usePasskeysFlow(makeOpts()));
    act(() => { result.current.openDelete('passkey-1'); });
    expect(result.current.deleteStep).toBe('password');
    expect(result.current.passkeyToDelete).toBe('passkey-1');
  });

  it('8. handleDeletePassword success calls refreshMfa', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePasskeysFlow(opts));
    act(() => { result.current.openDelete('passkey-1'); });

    await act(async () => {
      await result.current.handleDeletePassword('password');
    });

    expect(opts.onDeleteMfaVerification).toHaveBeenCalledWith('passkey-1', 'vid-1', expect.any(Number));
    expect(opts.onSuccess).toHaveBeenCalledWith('Passkey deleted');
    expect(opts.onRefreshMfa).toHaveBeenCalled();
    expect(result.current.deleteStep).toBeNull();
  });

  it('9. handleDeletePassword failure shows error', async () => {
    const opts = makeOpts({
      onDeleteMfaVerification: vi.fn().mockResolvedValue(ACTION_FAIL),
    });
    const { result } = renderHook(() => usePasskeysFlow(opts));
    act(() => { result.current.openDelete('passkey-1'); });

    await act(async () => {
      await result.current.handleDeletePassword('password');
    });

    expect(opts.onError).toHaveBeenCalledWith('ACTION_FAILED');
    expect(result.current.deleteStep).toBeNull();
  });

  it('10. openRename() sets renameStep=password', () => {
    const { result } = renderHook(() => usePasskeysFlow(makeOpts()));
    act(() => { result.current.openRename('passkey-1'); });
    expect(result.current.renameStep).toBe('password');
    expect(result.current.passkeyToRename).toBe('passkey-1');
  });

  it('11. handleRenamePassword success transitions to rename step with token', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePasskeysFlow(opts));
    act(() => { result.current.openRename('passkey-1'); });

    await act(async () => {
      await result.current.handleRenamePassword('password');
    });

    expect(result.current.renameStep).toBe('rename');
    expect(result.current.identityToken).toEqual({
      verificationRecordId: 'vid-1',
      verificationTimestamp: expect.any(Number),
    });
  });

  it('12. handleRenameSubmit success calls onSuccess + refreshMfa', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePasskeysFlow(opts));
    act(() => { result.current.openRename('passkey-1'); });

    await act(async () => { await result.current.handleRenamePassword('password'); });
    await act(async () => { await result.current.handleRenameSubmit('My New Name'); });

    expect(opts.onRenamePasskey).toHaveBeenCalledWith(
      'passkey-1',
      'My New Name',
      'vid-1',
      expect.any(Number),
    );
    expect(opts.onSuccess).toHaveBeenCalledWith('Passkey renamed');
    expect(opts.onRefreshMfa).toHaveBeenCalled();
    expect(result.current.renameStep).toBeNull();
  });

  it('13. openAction() for mobile rename', () => {
    const { result } = renderHook(() => usePasskeysFlow(makeOpts()));
    act(() => { result.current.openAction('passkey-1', 'rename'); });
    expect(result.current.actionStep).toBe('password');
    expect(result.current.actionPasskeyId).toBe('passkey-1');
    expect(result.current.actionMode).toBe('rename');
  });

  it('14. switchActionMode() changes mode', () => {
    const { result } = renderHook(() => usePasskeysFlow(makeOpts()));
    act(() => { result.current.openAction('passkey-1', 'rename'); });
    act(() => { result.current.switchActionMode('remove'); });
    expect(result.current.actionMode).toBe('remove');
  });
});
