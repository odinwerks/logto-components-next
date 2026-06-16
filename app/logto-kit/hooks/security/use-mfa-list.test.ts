import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMfaList } from './use-mfa-list';
import type { UseMfaListOptions } from './use-mfa-list';
import type { MfaVerification } from '../../logic/types';

const makeTotp = (id = 'totp-1'): MfaVerification => ({
  id,
  type: 'Totp',
  createdAt: '2024-01-01T00:00:00.000Z',
});

const makeBackupCode = (id = 'bc-1'): MfaVerification => ({
  id,
  type: 'BackupCode',
  createdAt: '2024-01-01T00:00:00.000Z',
  remainCodes: 8,
});

const makeWebAuthn = (id = 'wa-1'): MfaVerification => ({
  id,
  type: 'WebAuthn',
  name: 'My Passkey',
  createdAt: '2024-01-01T00:00:00.000Z',
});

const makeOpts = (overrides?: Partial<UseMfaListOptions>): UseMfaListOptions => ({
  onGetMfaVerifications: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  onError: vi.fn(),
  ...overrides,
});

describe('useMfaList', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. starts with empty list and isLoading=false', () => {
    // Prevent the mount-effect from resolving immediately
    const onGetMfaVerifications = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMfaList(makeOpts({ onGetMfaVerifications })));

    // Initial state before the async fetch resolves
    expect(result.current.mfaList).toEqual([]);
  });

  it('2. loads MFA list on mount', async () => {
    const data = [makeTotp(), makeBackupCode()];
    const opts = makeOpts({
      onGetMfaVerifications: vi.fn().mockResolvedValue({ ok: true, data }),
    });

    const { result } = renderHook(() => useMfaList(opts));

    await act(async () => {});

    expect(opts.onGetMfaVerifications).toHaveBeenCalledTimes(1);
    expect(result.current.mfaList).toEqual(data);
  });

  it('3. totpFactor is undefined when list empty', async () => {
    const { result } = renderHook(() => useMfaList(makeOpts()));
    await act(async () => {});
    expect(result.current.totpFactor).toBeUndefined();
  });

  it('4. totpFactor found when list has Totp item', async () => {
    const totp = makeTotp();
    const opts = makeOpts({
      onGetMfaVerifications: vi.fn().mockResolvedValue({ ok: true, data: [totp] }),
    });
    const { result } = renderHook(() => useMfaList(opts));
    await act(async () => {});
    expect(result.current.totpFactor).toEqual(totp);
  });

  it('5. backupFactor found when list has BackupCode item', async () => {
    const bc = makeBackupCode();
    const opts = makeOpts({
      onGetMfaVerifications: vi.fn().mockResolvedValue({ ok: true, data: [bc] }),
    });
    const { result } = renderHook(() => useMfaList(opts));
    await act(async () => {});
    expect(result.current.backupFactor).toEqual(bc);
  });

  it('6. webAuthnFactors filters WebAuthn items', async () => {
    const wa1 = makeWebAuthn('wa-1');
    const wa2 = makeWebAuthn('wa-2');
    const totp = makeTotp();
    const opts = makeOpts({
      onGetMfaVerifications: vi.fn().mockResolvedValue({ ok: true, data: [wa1, totp, wa2] }),
    });
    const { result } = renderHook(() => useMfaList(opts));
    await act(async () => {});
    expect(result.current.webAuthnFactors).toEqual([wa1, wa2]);
  });

  it('7. hasOtherMfaFactor true when Totp or WebAuthn present', async () => {
    const opts = makeOpts({
      onGetMfaVerifications: vi.fn().mockResolvedValue({ ok: true, data: [makeTotp()] }),
    });
    const { result } = renderHook(() => useMfaList(opts));
    await act(async () => {});
    expect(result.current.hasOtherMfaFactor).toBe(true);
  });

  it('7b. hasOtherMfaFactor false when only BackupCode present', async () => {
    const opts = makeOpts({
      onGetMfaVerifications: vi.fn().mockResolvedValue({ ok: true, data: [makeBackupCode()] }),
    });
    const { result } = renderHook(() => useMfaList(opts));
    await act(async () => {});
    expect(result.current.hasOtherMfaFactor).toBe(false);
  });

  it('8. refresh re-fetches the list', async () => {
    const firstData = [makeTotp()];
    const secondData = [makeTotp(), makeBackupCode()];
    const onGetMfaVerifications = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, data: firstData })
      .mockResolvedValueOnce({ ok: true, data: secondData });

    const { result } = renderHook(() => useMfaList(makeOpts({ onGetMfaVerifications })));
    await act(async () => {});
    expect(result.current.mfaList).toEqual(firstData);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.mfaList).toEqual(secondData);
    expect(onGetMfaVerifications).toHaveBeenCalledTimes(2);
  });
});
