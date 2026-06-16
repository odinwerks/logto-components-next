import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNameForm } from './use-name-form';
import type { UserData } from '../logic/types';

function makeUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    id: 'user-1',
    username: 'jdoe',
    name: 'John Doe',
    avatar: '',
    primaryEmail: 'john@example.com',
    primaryPhone: '',
    profile: { givenName: 'John', familyName: 'Doe' },
    customData: {},
    identities: {},
    ...overrides,
  };
}

function makeOptions(overrides: Partial<Parameters<typeof useNameForm>[0]> = {}) {
  return {
    userData: makeUserData(),
    nameType: 'given_family' as const,
    onUpdateBasicInfo: vi.fn().mockResolvedValue({ ok: true }),
    onUpdateProfile: vi.fn().mockResolvedValue({ ok: true }),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    refreshData: vi.fn(),
    successMessage: 'Profile updated!',
    ...overrides,
  };
}

describe('useNameForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Initial state ────────────────────────────────────────────────────────

  it('initializes from userData', () => {
    const { result } = renderHook(() => useNameForm(makeOptions()));
    expect(result.current.givenName).toBe('John');
    expect(result.current.familyName).toBe('Doe');
    expect(result.current.username).toBe('jdoe');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.nameChanged).toBe(false);
  });

  it('initializes with empty strings when profile fields are missing', () => {
    const opts = makeOptions({
      userData: makeUserData({ profile: {}, username: undefined }),
    });
    const { result } = renderHook(() => useNameForm(opts));
    expect(result.current.givenName).toBe('');
    expect(result.current.familyName).toBe('');
    expect(result.current.username).toBe('');
  });

  // ─── Dirty checking ───────────────────────────────────────────────────────

  it('nameChanged is true when givenName is modified (given_family mode)', () => {
    const { result } = renderHook(() => useNameForm(makeOptions()));
    act(() => { result.current.setGivenName('Jane'); });
    expect(result.current.nameChanged).toBe(true);
  });

  it('nameChanged is true when familyName is modified (given_family mode)', () => {
    const { result } = renderHook(() => useNameForm(makeOptions()));
    act(() => { result.current.setFamilyName('Smith'); });
    expect(result.current.nameChanged).toBe(true);
  });

  it('nameChanged is false when returned to original (given_family mode)', () => {
    const { result } = renderHook(() => useNameForm(makeOptions()));
    act(() => { result.current.setGivenName('Jane'); });
    expect(result.current.nameChanged).toBe(true);
    act(() => { result.current.setGivenName('John'); });
    expect(result.current.nameChanged).toBe(false);
  });

  it('nameChanged uses only username in username mode', () => {
    const opts = makeOptions({ nameType: 'username' });
    const { result } = renderHook(() => useNameForm(opts));
    act(() => { result.current.setGivenName('Whatever'); });
    expect(result.current.nameChanged).toBe(false);
    act(() => { result.current.setUsername('newname'); });
    expect(result.current.nameChanged).toBe(true);
  });

  it('nameChanged uses all fields in full mode', () => {
    const opts = makeOptions({ nameType: 'full' });
    const { result } = renderHook(() => useNameForm(opts));
    act(() => { result.current.setUsername('new_user'); });
    expect(result.current.nameChanged).toBe(true);
  });

  // ─── Discard ──────────────────────────────────────────────────────────────

  it('discard reverts givenName and familyName', () => {
    const { result } = renderHook(() => useNameForm(makeOptions()));
    act(() => {
      result.current.setGivenName('Changed');
      result.current.setFamilyName('Also');
    });
    expect(result.current.nameChanged).toBe(true);
    act(() => { result.current.discard(); });
    expect(result.current.givenName).toBe('John');
    expect(result.current.familyName).toBe('Doe');
    expect(result.current.nameChanged).toBe(false);
  });

  it('discard also reverts username in full mode', () => {
    const opts = makeOptions({ nameType: 'full' });
    const { result } = renderHook(() => useNameForm(opts));
    act(() => { result.current.setUsername('changed'); });
    act(() => { result.current.discard(); });
    expect(result.current.username).toBe('jdoe');
  });

  it('discard does not revert username in given_family mode', () => {
    const { result } = renderHook(() => useNameForm(makeOptions()));
    act(() => { result.current.setUsername('other'); });
    act(() => { result.current.discard(); });
    // username should remain 'other' in given_family mode
    expect(result.current.username).toBe('other');
  });

  // ─── Prop-change sync (useRef guard) ──────────────────────────────────────

  it('syncs givenName when userData.profile.givenName changes', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook((o) => useNameForm(o), { initialProps: opts });
    expect(result.current.givenName).toBe('John');

    const newOpts = makeOptions({
      userData: makeUserData({ profile: { givenName: 'Jane', familyName: 'Doe' } }),
    });
    rerender(newOpts);
    expect(result.current.givenName).toBe('Jane');
  });

  it('syncs username when userData.username changes', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook((o) => useNameForm(o), { initialProps: opts });
    const newOpts = makeOptions({ userData: makeUserData({ username: 'newuser' }) });
    rerender(newOpts);
    expect(result.current.username).toBe('newuser');
  });

  // ─── Save - given_family mode ─────────────────────────────────────────────

  it('save calls onUpdateBasicInfo and onUpdateProfile in given_family mode', async () => {
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile = vi.fn().mockResolvedValue({ ok: true });
    const onSuccess = vi.fn();
    const refreshData = vi.fn();
    const opts = makeOptions({ onUpdateBasicInfo, onUpdateProfile, onSuccess, refreshData });
    const { result } = renderHook(() => useNameForm(opts));

    act(() => { result.current.setGivenName('Alice'); });
    await act(async () => { await result.current.save(); });

    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ name: 'Alice Doe' });
    expect(onUpdateProfile).toHaveBeenCalledWith({ givenName: 'Alice', familyName: 'Doe' });
    expect(onSuccess).toHaveBeenCalledWith('Profile updated!');
    expect(refreshData).toHaveBeenCalled();
  });

  it('save calls rollback and refreshData when onUpdateProfile fails in given_family mode', async () => {
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile = vi.fn().mockResolvedValue({ ok: false, error: 'Profile failed' });
    const onError = vi.fn();
    const refreshData = vi.fn();
    const opts = makeOptions({ onUpdateBasicInfo, onUpdateProfile, onError, refreshData });
    const { result } = renderHook(() => useNameForm(opts));

    act(() => { result.current.setGivenName('Alice'); });
    await act(async () => { await result.current.save(); });

    // Should have called onUpdateBasicInfo twice: once for save, once for rollback
    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith('Profile failed');
    expect(refreshData).toHaveBeenCalled();
  });

  it('save handles onUpdateBasicInfo failure in given_family mode', async () => {
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: false, error: 'Basic failed' });
    const onUpdateProfile = vi.fn();
    const onError = vi.fn();
    const refreshData = vi.fn();
    const opts = makeOptions({ onUpdateBasicInfo, onUpdateProfile, onError, refreshData });
    const { result } = renderHook(() => useNameForm(opts));

    act(() => { result.current.setGivenName('Alice'); });
    await act(async () => { await result.current.save(); });

    expect(onUpdateProfile).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Basic failed');
    expect(refreshData).toHaveBeenCalled();
  });

  // ─── Save - username mode ─────────────────────────────────────────────────

  it('save calls onUpdateBasicInfo with username in username mode', async () => {
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile = vi.fn();
    const opts = makeOptions({ nameType: 'username', onUpdateBasicInfo, onUpdateProfile });
    const { result } = renderHook(() => useNameForm(opts));

    act(() => { result.current.setUsername('newname'); });
    await act(async () => { await result.current.save(); });

    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ username: 'newname' });
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  // ─── Save - full mode ─────────────────────────────────────────────────────

  it('save calls both onUpdateBasicInfo and onUpdateProfile in full mode when names changed', async () => {
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile = vi.fn().mockResolvedValue({ ok: true });
    const opts = makeOptions({ nameType: 'full', onUpdateBasicInfo, onUpdateProfile });
    const { result } = renderHook(() => useNameForm(opts));

    act(() => {
      result.current.setGivenName('Bob');
      result.current.setUsername('bobsmith');
    });
    await act(async () => { await result.current.save(); });

    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ username: 'bobsmith', name: 'Bob Doe' });
    expect(onUpdateProfile).toHaveBeenCalledWith({ givenName: 'Bob', familyName: 'Doe' });
  });

  it('save does not call onUpdateProfile in full mode when only username changed', async () => {
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile = vi.fn();
    const opts = makeOptions({ nameType: 'full', onUpdateBasicInfo, onUpdateProfile });
    const { result } = renderHook(() => useNameForm(opts));

    act(() => { result.current.setUsername('different'); });
    await act(async () => { await result.current.save(); });

    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  it('save calls rollback and refreshData when onUpdateProfile fails in full mode', async () => {
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile = vi.fn().mockResolvedValue({ ok: false, error: 'Profile failed' });
    const onError = vi.fn();
    const refreshData = vi.fn();
    const opts = makeOptions({ nameType: 'full', onUpdateBasicInfo, onUpdateProfile, onError, refreshData });
    const { result } = renderHook(() => useNameForm(opts));

    act(() => {
      result.current.setGivenName('Alice');
      result.current.setUsername('alice_username');
    });
    await act(async () => { await result.current.save(); });

    // Should have called onUpdateBasicInfo twice: once for save, once for rollback
    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith('Profile failed');
    expect(refreshData).toHaveBeenCalled();
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it('isLoading is true while save is in progress', async () => {
    let resolveBasic: (v: { ok: boolean }) => void = () => {};
    const pending = new Promise((r) => { resolveBasic = r; });
    const opts = makeOptions({ onUpdateBasicInfo: vi.fn().mockReturnValue(pending) });
    const { result } = renderHook(() => useNameForm(opts));

    act(() => { result.current.setGivenName('Test'); });

    let savePromise: Promise<void>;
    act(() => { savePromise = result.current.save(); });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveBasic({ ok: true });
      await savePromise!;
    });

    expect(result.current.isLoading).toBe(false);
  });
});
