import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enUS } from '../../../locales/en-US';
import { DARK_COLORS } from '../../../themes';

vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(),
  getAccessToken: vi.fn(),
  signOut: vi.fn(),
}));

// ── Mocks (use vi.hoisted for values vi.mock factories need) ──

const { mockReadEnv, MockUserBadge } = vi.hoisted(() => ({
  mockReadEnv: vi.fn(),
  MockUserBadge: () => null,
}));

vi.mock('../../../logic/env', () => ({
  readEnv: (...args: Parameters<typeof import('../../../logic/env')['readEnv']>) =>
    mockReadEnv(...args),
}));

// Mock actions barrel (avoids @logto/next resolution issues)
vi.mock('../../../logic/actions', () => ({
  updateAvatarUrl: async () => ({ ok: true } as ActionResult),
  uploadAvatar: async () => ({ ok: true, data: { url: null } }),
  getUserRoles: async () => ({ ok: true, data: [] }),
  getUserScopes: async () => ({ ok: true, data: [] }),
}));

// Mock use-avatar-upload
vi.mock('../../handlers/use-avatar-upload', () => ({
  useAvatarUpload: () => ({
    upload: async () => null,
    isUploading: false,
    error: null,
    clearError: () => undefined,
  }),
}));

// Mock userbutton (avoids LogtoProvider dependency)
vi.mock('../../userbutton', () => ({
  UserBadge: MockUserBadge,
}));

import { render, screen, fireEvent, act } from '@testing-library/react';
import { ProfileTab } from './profile';
import type { UserData } from '../../../logic/types';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';

// ── Stub callbacks ────────────────────────────────────────
const noop = () => undefined;
const resolvedActionResult = () => Promise.resolve({ ok: true } as ActionResult);
const resolvedVerifyPassword = () => Promise.resolve({ ok: true, data: { verificationRecordId: 'mock' } } as DataResult<{ verificationRecordId: string }>);
const resolvedSendVerification = () => Promise.resolve({ ok: true, data: { verificationId: 'mock' } } as DataResult<{ verificationId: string }>);
const resolvedVerifyCode = () => Promise.resolve({ ok: true, data: { verificationRecordId: 'mock' } } as DataResult<{ verificationRecordId: string }>);

const defaultUserData: UserData = {
  id: 'test-user',
  username: 'testuser',
  name: 'Test User',
  avatar: undefined,
  primaryEmail: 'test@example.com',
  primaryPhone: '+1234567890',
  profile: {
    givenName: 'Test',
    familyName: 'User',
  },
  identities: {},
  customData: {},
  createdAt: 0,
  updatedAt: 0,
};

interface RenderProfileOptions {
  userData?: UserData;
  onUpdateBasicInfo?: (updates: { name?: string; username?: string }) => Promise<ActionResult>;
  onUpdateProfile?: (profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>;
}

function renderProfile(
  nameType: string | undefined = undefined,
  { userData = defaultUserData, onUpdateBasicInfo, onUpdateProfile }: RenderProfileOptions = {},
) {
  mockReadEnv.mockImplementation((key: string) => {
    if (key === 'NAME_TYPE') return nameType;
    if (key === 'USER_SHAPE') return 'circle';
    return undefined;
  });

  const basicInfoFn = (onUpdateBasicInfo ?? vi.fn<(updates: { name?: string; username?: string }) => Promise<ActionResult>>().mockResolvedValue({ ok: true })) as (updates: { name?: string; username?: string }) => Promise<ActionResult>;
  const profileFn   = (onUpdateProfile   ?? vi.fn<(profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>>().mockResolvedValue({ ok: true })) as (profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>;

  const result = render(
    <ProfileTab
      userData={userData}
      mode="dark"
      colors={DARK_COLORS}
      t={enUS}
      onUpdateBasicInfo={basicInfoFn}
      onUpdateAvatarUrl={resolvedActionResult}
      onUpdateProfile={profileFn}
      onVerifyPassword={resolvedVerifyPassword}
      onSendEmailVerification={resolvedSendVerification}
      onSendPhoneVerification={resolvedSendVerification}
      onVerifyCode={resolvedVerifyCode}
      onUpdateEmail={resolvedActionResult}
      onUpdatePhone={resolvedActionResult}
      onRemoveEmail={resolvedActionResult}
      onRemovePhone={resolvedActionResult}
      onSuccess={noop}
      onError={noop}
      refreshData={noop}
    />,
  );

  return { ...result, basicInfoFn, profileFn };
}

describe('ProfileTab — NAME_TYPE gating', () => {
  beforeEach(() => {
    mockReadEnv.mockClear();
  });

  describe('given_family mode (default)', () => {
    it('renders first name and last name inputs when NAME_TYPE is unset', () => {
      renderProfile(undefined);
      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Enter username (optional)')).not.toBeInTheDocument();
    });

    it('renders first name and last name inputs when NAME_TYPE is given_family', () => {
      renderProfile('given_family');
      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Enter username (optional)')).not.toBeInTheDocument();
    });
  });

  describe('username mode', () => {
    it('renders only the username input', () => {
      renderProfile('username');
      expect(screen.getByPlaceholderText('Enter username (optional)')).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('First name')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Last name')).not.toBeInTheDocument();
    });
  });

  describe('full mode', () => {
    it('renders username, first name, and last name inputs', () => {
      renderProfile('full');
      expect(screen.getByPlaceholderText('Enter username (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    });
  });
});

describe('ProfileTab — behavioral', () => {
  beforeEach(() => {
    mockReadEnv.mockClear();
  });

  it('username mode — save calls onUpdateBasicInfo with username only, not onUpdateProfile', async () => {
    const userData: UserData = {
      ...defaultUserData,
      username: 'olduser',
    };
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile   = vi.fn().mockResolvedValue({ ok: true });

    renderProfile('username', { userData, onUpdateBasicInfo, onUpdateProfile });

    const usernameInput = screen.getByPlaceholderText('Enter username (optional)');
    fireEvent.change(usernameInput, { target: { value: 'newname' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await act(async () => { fireEvent.click(saveBtn); });

    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(1);
    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ username: 'newname' });
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  it('full mode — save calls both APIs when both changed', async () => {
    const userData: UserData = {
      ...defaultUserData,
      username: 'olduser',
      profile: { givenName: '', familyName: '' },
    };
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile   = vi.fn().mockResolvedValue({ ok: true });

    renderProfile('full', { userData, onUpdateBasicInfo, onUpdateProfile });

    const usernameInput = screen.getByPlaceholderText('Enter username (optional)');
    fireEvent.change(usernameInput, { target: { value: 'newuser' } });

    const givenInput  = screen.getByPlaceholderText('First name');
    const familyInput = screen.getByPlaceholderText('Last name');
    fireEvent.change(givenInput,  { target: { value: 'Alice' } });
    fireEvent.change(familyInput, { target: { value: 'Smith' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await act(async () => { fireEvent.click(saveBtn); });

    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(1);
    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ username: 'newuser', name: 'Alice Smith' });
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    expect(onUpdateProfile).toHaveBeenCalledWith({ givenName: 'Alice', familyName: 'Smith' });
  });

  it('full mode — username saved even when name fields are empty (Fix 1/3)', async () => {
    const userData: UserData = {
      ...defaultUserData,
      username: 'olduser',
      profile: { givenName: '', familyName: '' },
    };
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile   = vi.fn().mockResolvedValue({ ok: true });

    renderProfile('full', { userData, onUpdateBasicInfo, onUpdateProfile });

    // Leave given/family empty, only change username
    const usernameInput = screen.getByPlaceholderText('Enter username (optional)');
    fireEvent.change(usernameInput, { target: { value: 'brandnewuser' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await act(async () => { fireEvent.click(saveBtn); });

    // onUpdateBasicInfo MUST be called with username but no `name` key
    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(1);
    const callArg = onUpdateBasicInfo.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.username).toBe('brandnewuser');
    expect(callArg).not.toHaveProperty('name');
    // onUpdateProfile should NOT be called since name fields didn't change
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  it('invalid NAME_TYPE falls back to given_family and renders given/family inputs', () => {
    renderProfile('invalid-value');
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter username (optional)')).not.toBeInTheDocument();
  });

  // BUG 1: Stale givenName/familyName after refreshData()
  it('syncs givenName and familyName when userData prop changes (e.g. after refreshData)', () => {
    const initialUserData: UserData = {
      ...defaultUserData,
      profile: { givenName: 'Alice', familyName: 'Smith' },
    };
    const { rerender } = renderProfile('given_family', { userData: initialUserData });

    const givenInput = screen.getByPlaceholderText('First name') as HTMLInputElement;
    const familyInput = screen.getByPlaceholderText('Last name') as HTMLInputElement;
    expect(givenInput.value).toBe('Alice');
    expect(familyInput.value).toBe('Smith');

    // Simulate refreshData() returning updated profile data
    const updatedUserData: UserData = {
      ...initialUserData,
      profile: { givenName: 'Bob', familyName: 'Jones' },
    };

    rerender(
      <ProfileTab
        userData={updatedUserData}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        onUpdateBasicInfo={vi.fn().mockResolvedValue({ ok: true })}
        onUpdateAvatarUrl={resolvedActionResult}
        onUpdateProfile={vi.fn().mockResolvedValue({ ok: true })}
        onVerifyPassword={resolvedVerifyPassword}
        onSendEmailVerification={resolvedSendVerification}
        onSendPhoneVerification={resolvedSendVerification}
        onVerifyCode={resolvedVerifyCode}
        onUpdateEmail={resolvedActionResult}
        onUpdatePhone={resolvedActionResult}
        onRemoveEmail={resolvedActionResult}
        onRemovePhone={resolvedActionResult}
        onSuccess={noop}
        onError={noop}
        refreshData={noop}
      />,
    );

    expect(givenInput.value).toBe('Bob');
    expect(familyInput.value).toBe('Jones');
  });

  // BUG-015 FIX: onError fires first, then refreshData (so user sees error before data refreshes)
  it('given_family mode — calls onError before refreshData when profile update fails after basic info succeeds', async () => {
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile = vi.fn().mockResolvedValue({ ok: false, error: 'Profile update failed' } as ActionResult);
    const refreshData = vi.fn();
    const onError = vi.fn();

    mockReadEnv.mockImplementation((key: string) => {
      if (key === 'NAME_TYPE') return 'given_family';
      if (key === 'USER_SHAPE') return 'circle';
      return undefined;
    });

    render(
      <ProfileTab
        userData={defaultUserData}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        onUpdateBasicInfo={onUpdateBasicInfo}
        onUpdateAvatarUrl={resolvedActionResult}
        onUpdateProfile={onUpdateProfile}
        onVerifyPassword={resolvedVerifyPassword}
        onSendEmailVerification={resolvedSendVerification}
        onSendPhoneVerification={resolvedSendVerification}
        onVerifyCode={resolvedVerifyCode}
        onUpdateEmail={resolvedActionResult}
        onUpdatePhone={resolvedActionResult}
        onRemoveEmail={resolvedActionResult}
        onRemovePhone={resolvedActionResult}
        onSuccess={noop}
        onError={onError}
        refreshData={refreshData}
      />,
    );

    // Change first name to trigger the save button
    const givenInput = screen.getByPlaceholderText('First name');
    fireEvent.change(givenInput, { target: { value: 'Changed' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await act(async () => { fireEvent.click(saveBtn); });

    // onError must be called before refreshData (user sees error, then data refreshes)
    expect(onError).toHaveBeenCalled();
    expect(refreshData).toHaveBeenCalled();
    const errorCallOrder = onError.mock.invocationCallOrder[0];
    const refreshCallOrder = refreshData.mock.invocationCallOrder[0];
    expect(errorCallOrder).toBeLessThan(refreshCallOrder);
  });
});
