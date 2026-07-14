import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enUS } from '../../../locales/en-US';
import { DARK_COLORS } from '../../../themes';

vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(),
  getAccessToken: vi.fn(),
  signOut: vi.fn(),
}));

// ── Mocks (use vi.hoisted for values vi.mock factories need) ──

const {
  mockReadEnv,
  MockUserBadge,
  mockLoadPersonalPermissions,
  mockLoadPersonalRoles,
  mockUpload,
  mockUseAvatarUpload,
  getLastAvatarUploadOnSuccess,
} = vi.hoisted(() => {
  let lastAvatarUploadOnSuccess: ((url: string) => void | Promise<void>) | undefined;
  const upload = vi.fn(async () => null as string | null);
  const useAvatarUpload = vi.fn((options?: { onSuccess?: (url: string) => void | Promise<void> }) => {
    lastAvatarUploadOnSuccess = options?.onSuccess;
    return {
      upload,
      isUploading: false,
      error: null,
      clearError: () => undefined,
    };
  });

  return {
  mockReadEnv: vi.fn((key: string, _allowPublic?: boolean): string | undefined => key === 'APP_SECRET' ? 'dummy-secret' : undefined),
  MockUserBadge: () => null,
  mockLoadPersonalPermissions: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  mockLoadPersonalRoles: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    mockUpload: upload,
    mockUseAvatarUpload: useAvatarUpload,
    getLastAvatarUploadOnSuccess: () => lastAvatarUploadOnSuccess,
  };
});

vi.mock('../../../server-actions', () => ({
  loadPersonalPermissions: () => mockLoadPersonalPermissions(),
  loadPersonalRoles: () => mockLoadPersonalRoles(),
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
vi.mock('../../../hooks/use-avatar-upload', () => ({
  useAvatarUpload: (options?: { onSuccess?: (url: string) => void | Promise<void> }) => mockUseAvatarUpload(options),
}));

// Mock userbutton (avoids LogtoProvider dependency)
vi.mock('../../UserButton', () => ({
  UserBadge: MockUserBadge,
}));

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ProfileTab } from './profile';
import type { UserData } from '../../../logic/types';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';

// ── Stub callbacks ────────────────────────────────────────
const noop = () => undefined;
const resolvedActionResult = () => Promise.resolve({ ok: true } as ActionResult);
const resolvedVerifyPassword = () => Promise.resolve({ ok: true, data: { verificationRecordId: 'mock', verificationTimestamp: Date.now() + 600000 } } as DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);
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
    if (key === 'APP_SECRET') return 'dummy-secret';
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
      nameType={nameType}
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

describe('ProfileTab - NAME_TYPE gating', () => {
  beforeEach(() => {
    mockReadEnv.mockClear();
    mockUpload.mockClear();
    mockUseAvatarUpload.mockClear();
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

describe('ProfileTab - behavioral', () => {
  beforeEach(() => {
    mockReadEnv.mockClear();
  });

  it('username mode - save calls onUpdateBasicInfo with username only, not onUpdateProfile', async () => {
    const userData: UserData = {
      ...defaultUserData,
      username: 'olduser',
    };
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile   = vi.fn().mockResolvedValue({ ok: true });

    renderProfile('username', { userData, onUpdateBasicInfo, onUpdateProfile });

    // Enter edit mode first (inputs are readOnly until Edit is clicked)
    // getAllByRole is used because the ContactRow email/phone sections also
    // render "Edit" buttons — the name editor's Edit is the first in DOM order.
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]!);
    // AnimatePresence schedules enter animation via rAF — wait for buttons to appear
    await waitFor(() => screen.getByRole('button', { name: /modify/i }));

    const usernameInput = screen.getByPlaceholderText('Enter username (optional)');
    fireEvent.change(usernameInput, { target: { value: 'newname' } });

    const saveBtn = screen.getByRole('button', { name: /modify/i });
    await act(async () => { fireEvent.click(saveBtn); });

    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(1);
    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ username: 'newname' });
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  it('full mode - save calls both APIs when both changed', async () => {
    const userData: UserData = {
      ...defaultUserData,
      username: 'olduser',
      profile: { givenName: '', familyName: '' },
    };
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile   = vi.fn().mockResolvedValue({ ok: true });

    renderProfile('full', { userData, onUpdateBasicInfo, onUpdateProfile });

    // Enter edit mode first
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]!);
    await waitFor(() => screen.getByRole('button', { name: /modify/i }));

    const usernameInput = screen.getByPlaceholderText('Enter username (optional)');
    fireEvent.change(usernameInput, { target: { value: 'newuser' } });

    const givenInput  = screen.getByPlaceholderText('First name');
    const familyInput = screen.getByPlaceholderText('Last name');
    fireEvent.change(givenInput,  { target: { value: 'Alice' } });
    fireEvent.change(familyInput, { target: { value: 'Smith' } });

    const saveBtn = screen.getByRole('button', { name: /modify/i });
    await act(async () => { fireEvent.click(saveBtn); });

    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(1);
    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ username: 'newuser', name: 'Alice Smith' });
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    expect(onUpdateProfile).toHaveBeenCalledWith({ givenName: 'Alice', familyName: 'Smith' });
  });

  it('full mode - username saved even when name fields are empty (Fix 1/3)', async () => {
    const userData: UserData = {
      ...defaultUserData,
      username: 'olduser',
      profile: { givenName: '', familyName: '' },
    };
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile   = vi.fn().mockResolvedValue({ ok: true });

    renderProfile('full', { userData, onUpdateBasicInfo, onUpdateProfile });

    // Enter edit mode first
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]!);
    await waitFor(() => screen.getByRole('button', { name: /modify/i }));

    // Leave given/family empty, only change username
    const usernameInput = screen.getByPlaceholderText('Enter username (optional)');
    fireEvent.change(usernameInput, { target: { value: 'brandnewuser' } });

    const saveBtn = screen.getByRole('button', { name: /modify/i });
    await act(async () => { fireEvent.click(saveBtn); });

    // onUpdateBasicInfo MUST be called with username; name is now sent as '' so
    // the server can clear any stale userData.name (previously the falsy guard
    // omitted the key, leaving the name stale — see regression tests below).
    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(1);
    const callArg = onUpdateBasicInfo.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.username).toBe('brandnewuser');
    expect(callArg.name).toBe('');
    // onUpdateProfile should NOT be called since name fields didn't change
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  // Regression for BUG-PR-001: clearing both given and family name in
  // given_family mode must send name: '' so the server can clear userData.name.
  // Previously the falsy `if (name)` guard skipped onUpdateBasicInfo entirely,
  // leaving userData.name stale while profile.givenName/familyName were cleared.
  it('given_family mode - clearing both name fields sends name: "" (stale-name regression)', async () => {
    const userData: UserData = {
      ...defaultUserData,
      name: 'Old Name',
      profile: { givenName: 'Old', familyName: 'Name' },
    };
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile   = vi.fn().mockResolvedValue({ ok: true });

    renderProfile('given_family', { userData, onUpdateBasicInfo, onUpdateProfile });

    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]!);
    await waitFor(() => screen.getByRole('button', { name: /modify/i }));

    const givenInput  = screen.getByPlaceholderText('First name');
    const familyInput = screen.getByPlaceholderText('Last name');
    fireEvent.change(givenInput,  { target: { value: '' } });
    fireEvent.change(familyInput, { target: { value: '' } });

    const saveBtn = screen.getByRole('button', { name: /modify/i });
    await act(async () => { fireEvent.click(saveBtn); });

    // name must be sent (as '') so the server can clear userData.name.
    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(1);
    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ name: '' });
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    expect(onUpdateProfile).toHaveBeenCalledWith({ givenName: '', familyName: '' });
  });

  // Regression for BUG-PR-002: clearing both given and family name in full mode
  // must include name: '' alongside username so the server can clear userData.name.
  // Previously `if (name) basicUpdates.name = name` omitted the key when empty.
  it('full mode - clearing both name fields while changing username sends name: "" (stale-name regression)', async () => {
    const userData: UserData = {
      ...defaultUserData,
      username: 'olduser',
      name: 'Old Name',
      profile: { givenName: 'Old', familyName: 'Name' },
    };
    const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: true });
    const onUpdateProfile   = vi.fn().mockResolvedValue({ ok: true });

    renderProfile('full', { userData, onUpdateBasicInfo, onUpdateProfile });

    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]!);
    await waitFor(() => screen.getByRole('button', { name: /modify/i }));

    const usernameInput = screen.getByPlaceholderText('Enter username (optional)');
    const givenInput    = screen.getByPlaceholderText('First name');
    const familyInput   = screen.getByPlaceholderText('Last name');
    fireEvent.change(usernameInput, { target: { value: 'brandnewuser' } });
    fireEvent.change(givenInput,    { target: { value: '' } });
    fireEvent.change(familyInput,   { target: { value: '' } });

    const saveBtn = screen.getByRole('button', { name: /modify/i });
    await act(async () => { fireEvent.click(saveBtn); });

    // name must be present (as '') alongside username so the server clears name.
    expect(onUpdateBasicInfo).toHaveBeenCalledTimes(1);
    expect(onUpdateBasicInfo).toHaveBeenCalledWith({ name: '', username: 'brandnewuser' });
    expect(onUpdateProfile).toHaveBeenCalledTimes(1);
    expect(onUpdateProfile).toHaveBeenCalledWith({ givenName: '', familyName: '' });
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
        nameType="given_family"
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

  // BUG-008 FIX: when Step 2 (profile update) fails after Step 1 (basic info) succeeds,
  // onError fires but refreshData must NOT be called - preserving the user's in-progress
  // edits so they can correct and retry without losing their changes.
  it('given_family mode - calls onError but NOT refreshData when profile update fails after basic info succeeds', async () => {
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
        nameType="given_family"
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

    // Click Edit to enter edit mode, then change first name
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]!);
    await waitFor(() => screen.getByRole('button', { name: /modify/i }));

    const givenInput = screen.getByPlaceholderText('First name');
    fireEvent.change(givenInput, { target: { value: 'Changed' } });

    const saveBtn = screen.getByRole('button', { name: /modify/i });
    await act(async () => { fireEvent.click(saveBtn); });

    // onError must be called, but refreshData must NOT be - edits are preserved for retry.
    expect(onError).toHaveBeenCalled();
    expect(refreshData).not.toHaveBeenCalled();
  });

  it('given_family mode - calls refreshData when profile update fails and the subsequent rollback of basic info fails', async () => {
    const onUpdateBasicInfo = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: 'Rollback failed' });
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
        nameType="given_family"
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

    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editBtns[0]!);
    await waitFor(() => screen.getByRole('button', { name: /modify/i }));

    const givenInput = screen.getByPlaceholderText('First name');
    fireEvent.change(givenInput, { target: { value: 'Changed' } });

    const saveBtn = screen.getByRole('button', { name: /modify/i });
    await act(async () => { fireEvent.click(saveBtn); });

    expect(onError).toHaveBeenCalled();
    expect(refreshData).toHaveBeenCalled();
  });

  it('PersonalPermissionsBlock - re-fetches permissions on refresh (BUG-002)', async () => {
    mockLoadPersonalPermissions.mockClear();
    mockLoadPersonalPermissions.mockResolvedValue({
      ok: true,
      data: [{ scope: 'read:profile', resourceName: 'Profile', resourceIndicator: 'https://api' }],
    });

    renderProfile(undefined);

    // Initial fetch should occur on mount
    expect(mockLoadPersonalPermissions).toHaveBeenCalledTimes(1);

    // Wait for the permissions to be loaded and rendered, so loading becomes false and the refresh button is enabled
    await screen.findByText('read:profile');

    const refreshButton = screen.getByRole('button', { name: enUS.profile.refreshPersonalPermissions });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(refreshButton!);
    });

    // useRefreshable has a 35ms timeout before making visible true again. Wait for it to be called.
    await waitFor(() => {
      expect(mockLoadPersonalPermissions).toHaveBeenCalledTimes(2);
    });
  });

  it('always persists uploaded avatar URL after upload success (no client env mismatch)', async () => {
    const onUpdateAvatarUrl = vi.fn().mockResolvedValue({ ok: true } as ActionResult);
    const refreshData = vi.fn();
    const onSuccess = vi.fn();

    mockReadEnv.mockImplementation((key: string) => {
      if (key === 'NAME_TYPE') return 'given_family';
      if (key === 'USER_SHAPE') return 'circle';
      if (key === 'PFP_BACKEND') return 'logto';
      return undefined;
    });

    render(
      <ProfileTab
        userData={defaultUserData}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        nameType="given_family"
        onUpdateBasicInfo={resolvedActionResult}
        onUpdateAvatarUrl={onUpdateAvatarUrl}
        onUpdateProfile={resolvedActionResult}
        onVerifyPassword={resolvedVerifyPassword}
        onSendEmailVerification={resolvedSendVerification}
        onSendPhoneVerification={resolvedSendVerification}
        onVerifyCode={resolvedVerifyCode}
        onUpdateEmail={resolvedActionResult}
        onUpdatePhone={resolvedActionResult}
        onRemoveEmail={resolvedActionResult}
        onRemovePhone={resolvedActionResult}
        onSuccess={onSuccess}
        onError={noop}
        refreshData={refreshData}
      />,
    );

    const onAvatarUploadSuccess = getLastAvatarUploadOnSuccess();
    expect(onAvatarUploadSuccess).toBeTypeOf('function');

    await act(async () => {
      await onAvatarUploadSuccess?.('https://s3.example.com/user123/you.png?v=1');
    });

    expect(onUpdateAvatarUrl).toHaveBeenCalledTimes(1);
    expect(onUpdateAvatarUrl).toHaveBeenCalledWith('https://s3.example.com/user123/you.png?v=1');
    expect(onSuccess).toHaveBeenCalled();
    expect(refreshData).toHaveBeenCalled();
  });

  describe('Avatar Modal Accessibility and Focus Management', () => {
    it('implements proper accessible dialog contract', async () => {
      renderProfile();
      
      const triggerBtn = screen.getByTitle('Change photo');
      fireEvent.click(triggerBtn);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'avatar-modal-title');
      expect(modal).toHaveAttribute('tabIndex', '-1');

      const title = screen.getByText(enUS.profile.profilePhoto);
      expect(title).toHaveAttribute('id', 'avatar-modal-title');

      const closeBtn = screen.getByLabelText('Close modal');
      expect(closeBtn).toBeInTheDocument();
    });

    it('manages focus: mounts focus and restores focus to trigger on close', async () => {
      renderProfile();
      
      const triggerBtn = screen.getByTitle('Change photo');
      // Set focus to the trigger button first to simulate real user action
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      // Open the modal
      fireEvent.click(triggerBtn);

      // Modal container should receive focus on mount
      const modal = screen.getByRole('dialog');
      expect(document.activeElement).toBe(modal);

      // Close the modal
      const closeBtn = screen.getByLabelText('Close modal');
      fireEvent.click(closeBtn);

      // AnimatePresence exit animation (60ms) must complete before the
      // focus-trap cleanup runs and restores focus to the trigger button
      await waitFor(() => {
        expect(document.activeElement).toBe(triggerBtn);
      });
    });

    it('traps focus correctly: loops from last to first and first to last', async () => {
      renderProfile();
      
      const triggerBtn = screen.getByTitle('Change photo');
      fireEvent.click(triggerBtn);

      const modal = screen.getByRole('dialog');
      const closeBtn = screen.getByLabelText('Close modal');
      const dropZone = screen.getByRole('button', { name: /drag/i });

      // In desktop mode with no avatar, focusable elements are [closeBtn, dropZone]
      // Let's first focus the dropZone (last element)
      dropZone.focus();
      expect(document.activeElement).toBe(dropZone);

      // Tab on last element should loop to first (closeBtn)
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(document.activeElement).toBe(closeBtn);

      // Shift+Tab on first element (closeBtn) should loop to last (dropZone)
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(dropZone);

      // Shift+Tab when focus is on the modal container itself should also loop to last (dropZone)
      modal.focus();
      expect(document.activeElement).toBe(modal);
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(dropZone);
    });

    it('excludes hidden file/camera inputs from focus trap candidates', async () => {
      renderProfile();
      
      const triggerBtn = screen.getByTitle('Change photo');
      fireEvent.click(triggerBtn);

      // Verify that hidden inputs are indeed in the DOM but cannot be focused by tabbing
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();

      screen.getByRole('dialog');
      // Our custom handler excludes input[type="file"], so focus loops directly between closeBtn and dropZone.
    });
  });

  describe('Name Editor — edit mode gating (Batch 3)', () => {
    // Helper: get the visible "Edit" button, filtering out AnimatePresence exit ghosts
    function getEditButton() {
      const buttons = screen.queryAllByRole('button', { name: /^edit$/i });
      // Filter out exit-animation ghosts (opacity: 0)
      return buttons.find(b => b.style.opacity !== '0') ?? buttons[0]!;
    }

    it('shows Edit button in read-only mode (desktop)', () => {
      renderProfile('username');
      const editBtn = getEditButton();
      expect(editBtn).toBeInTheDocument();
    });

    it('hides Edit button once in editing mode', async () => {
      renderProfile('username');
      const editBtn = getEditButton();
      fireEvent.click(editBtn);
      // AnimatePresence schedules enter/exit animations via rAF — wait for
      // the exit animation to complete (edit button opacity becomes 0)
      await waitFor(() => {
        const remaining = screen.queryAllByRole('button', { name: /^edit$/i });
        const visible = remaining.filter(b => b.style.opacity !== '0');
        expect(visible.length).toBe(0);
      });
    });

    it('fields are readOnly when not in edit mode', () => {
      renderProfile('full');
      const usernameInput = screen.getByPlaceholderText('Enter username (optional)') as HTMLInputElement;
      const givenInput = screen.getByPlaceholderText('First name') as HTMLInputElement;
      const familyInput = screen.getByPlaceholderText('Last name') as HTMLInputElement;

      expect(usernameInput.readOnly).toBe(true);
      expect(givenInput.readOnly).toBe(true);
      expect(familyInput.readOnly).toBe(true);
    });

    it('fields become editable in edit mode', () => {
      renderProfile('full');
      const editBtn = getEditButton();
      fireEvent.click(editBtn);

      const usernameInput = screen.getByPlaceholderText('Enter username (optional)') as HTMLInputElement;
      const givenInput = screen.getByPlaceholderText('First name') as HTMLInputElement;
      const familyInput = screen.getByPlaceholderText('Last name') as HTMLInputElement;

      expect(usernameInput.readOnly).toBe(false);
      expect(givenInput.readOnly).toBe(false);
      expect(familyInput.readOnly).toBe(false);
    });

    it('Modify button text is "Modify"', async () => {
      renderProfile('given_family');
      const editBtn = getEditButton();
      fireEvent.click(editBtn);
      await waitFor(() => screen.getByRole('button', { name: /modify/i }));
      expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument();
    });

    it('clicking Discard exits edit mode and resets fields', async () => {
      const userData: UserData = {
        ...defaultUserData,
        username: 'olduser',
      };
      renderProfile('username', { userData });

      const editBtn = getEditButton();
      fireEvent.click(editBtn);
      await waitFor(() => screen.getByRole('button', { name: /discard/i }));

      const usernameInput = screen.getByPlaceholderText('Enter username (optional)') as HTMLInputElement;
      expect(usernameInput.readOnly).toBe(false);
      fireEvent.change(usernameInput, { target: { value: 'changed' } });
      expect(usernameInput.value).toBe('changed');

      const discardBtn = screen.getByRole('button', { name: /discard/i });
      await act(async () => { fireEvent.click(discardBtn); });

      // After discard: readOnly restored, value reset
      const remainingDiscard = screen.queryAllByRole('button', { name: /discard/i }).filter(b => b.style.opacity !== '0');
      expect(remainingDiscard.length).toBe(0);
      expect(usernameInput.readOnly).toBe(true);
      expect(usernameInput.value).toBe('olduser');
    });

    it('save failure keeps user in edit mode', async () => {
      const onUpdateBasicInfo = vi.fn().mockResolvedValue({ ok: false, error: 'Failed' } as ActionResult);
      renderProfile('username', { onUpdateBasicInfo });

      const editBtn = getEditButton();
      fireEvent.click(editBtn);
      await waitFor(() => screen.getByRole('button', { name: /modify/i }));

      const usernameInput = screen.getByPlaceholderText('Enter username (optional)');
      fireEvent.change(usernameInput, { target: { value: 'newval' } });

      const saveBtn = screen.getByRole('button', { name: /modify/i });
      await act(async () => { fireEvent.click(saveBtn); });

      // Still in edit mode: Modify button still visible, field still editable
      expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument();
      expect((screen.getByPlaceholderText('Enter username (optional)') as HTMLInputElement).readOnly).toBe(false);
    });

    it('triple-field mode stacks Discard above Modify (vertical layout)', async () => {
      renderProfile('full');
      const editBtn = getEditButton();
      fireEvent.click(editBtn);
      await waitFor(() => screen.getByRole('button', { name: /discard/i }));

      const discardBtn = screen.getByRole('button', { name: /discard/i });
      const modifyBtn = screen.getByRole('button', { name: /modify/i });

      // Discard should appear before Modify in DOM order (vertical stack)
      const container = discardBtn.closest('div');
      expect(container).not.toBeNull();
      const buttons = Array.from(container!.children);
      const discardIndex = buttons.indexOf(discardBtn);
      const modifyIndex = buttons.indexOf(modifyBtn);
      expect(discardIndex).toBeLessThan(modifyIndex);
    });
  });

  describe('Name Editor — mobile (Batch 3)', () => {
    // Helper: get the visible "Edit" (pen) button, filtering out AnimatePresence exit ghosts
    function getMobilePenButton() {
      const buttons = screen.queryAllByRole('button', { name: /^edit$/i });
      return buttons.find(b => b.style.opacity !== '0') ?? buttons[0]!;
    }

    function renderMobile(nameType: string | undefined = undefined) {
      mockReadEnv.mockImplementation((key: string) => {
        if (key === 'NAME_TYPE') return nameType;
        if (key === 'USER_SHAPE') return 'circle';
        if (key === 'APP_SECRET') return 'dummy-secret';
        return undefined;
      });

      const onUpdateBasicInfo = vi.fn<(updates: { name?: string; username?: string }) => Promise<ActionResult>>().mockResolvedValue({ ok: true });
      const onUpdateProfile = vi.fn<(profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>>().mockResolvedValue({ ok: true });

      const result = render(
        <ProfileTab
          userData={defaultUserData}
          mode="dark"
          colors={DARK_COLORS}
          t={enUS}
          mobmode={1}
          nameType={nameType}
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
          onError={noop}
          refreshData={noop}
        />,
      );

      return { ...result, onUpdateBasicInfo, onUpdateProfile };
    }

    it('mobile: fields are readOnly when not in edit mode', () => {
      renderMobile('full');
      const usernameInput = screen.getByPlaceholderText('Enter username (optional)') as HTMLInputElement;
      const givenInput = screen.getByPlaceholderText('First name') as HTMLInputElement;
      const familyInput = screen.getByPlaceholderText('Last name') as HTMLInputElement;

      expect(usernameInput.readOnly).toBe(true);
      expect(givenInput.readOnly).toBe(true);
      expect(familyInput.readOnly).toBe(true);
    });

    it('mobile: pen icon button present when not editing', () => {
      renderMobile('given_family');
      // aria-label for pen button is "Edit"
      const penBtn = getMobilePenButton();
      expect(penBtn).toBeInTheDocument();
    });

    it('mobile: pen button click enters edit mode, reveals check + discard', async () => {
      renderMobile('given_family');
      const penBtn = getMobilePenButton();
      fireEvent.click(penBtn);
      // AnimatePresence schedules enter animation via rAF — wait for check button to appear
      await waitFor(() => screen.getByRole('button', { name: /modify/i }));

      // Check button should appear (aria-label: "Modify")
      expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument();
      // Discard X should appear
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
      // No visible pen buttons left
      const remaining = screen.queryAllByRole('button', { name: /^edit$/i }).filter(b => b.style.opacity !== '0');
      expect(remaining.length).toBe(0);
    });

    it('mobile: check button click calls save', async () => {
      const { onUpdateBasicInfo, onUpdateProfile } = renderMobile('given_family');

      const penBtn = getMobilePenButton();
      fireEvent.click(penBtn);
      await waitFor(() => screen.getByRole('button', { name: /modify/i }));

      const givenInput = screen.getByPlaceholderText('First name');
      fireEvent.change(givenInput, { target: { value: 'NewName' } });

      const checkBtn = screen.getByRole('button', { name: /modify/i });
      await act(async () => { fireEvent.click(checkBtn); });

      expect(onUpdateBasicInfo).toHaveBeenCalled();
      expect(onUpdateProfile).toHaveBeenCalled();
    });

    it('mobile: discard X appears above check in edit mode', async () => {
      renderMobile('given_family');
      const penBtn = getMobilePenButton();
      fireEvent.click(penBtn);
      await waitFor(() => screen.getByRole('button', { name: /discard/i }));

      const discardBtn = screen.getByRole('button', { name: /discard/i });
      const checkBtn = screen.getByRole('button', { name: /modify/i });

      // Both should be in the same column; discard above check
      const column = discardBtn.closest('div');
      expect(column).not.toBeNull();
      const children = Array.from(column!.children);
      const discardIndex = children.indexOf(discardBtn);
      const checkIndex = children.indexOf(checkBtn);
      expect(discardIndex).toBeLessThan(checkIndex);
    });
  });
});
