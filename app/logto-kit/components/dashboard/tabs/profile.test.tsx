import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enUS } from '../../../locales/en-US';
import { darkTheme } from '../../../themes';

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
  updateAvatarUrl: async () => undefined,
  uploadAvatar: async () => ({ url: null }),
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

// ── Stub callbacks ────────────────────────────────────────
const noop = () => undefined;
const resolvedNoop = () => Promise.resolve();
const resolvedVerifyPassword = () => Promise.resolve({ verificationRecordId: 'mock' });
const resolvedSendVerification = () => Promise.resolve({ verificationId: 'mock' });
const resolvedVerifyCode = () => Promise.resolve({ verificationRecordId: 'mock' });

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
  onUpdateBasicInfo?: ReturnType<typeof vi.fn>;
  onUpdateProfile?: ReturnType<typeof vi.fn>;
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

  const basicInfoFn = onUpdateBasicInfo ?? vi.fn().mockResolvedValue(undefined);
  const profileFn   = onUpdateProfile   ?? vi.fn().mockResolvedValue(undefined);

  const result = render(
    <ProfileTab
      userData={userData}
      theme={darkTheme}
      t={enUS}
      onUpdateBasicInfo={basicInfoFn}
      onUpdateAvatarUrl={resolvedNoop}
      onUpdateProfile={profileFn}
      onVerifyPassword={resolvedVerifyPassword}
      onSendEmailVerification={resolvedSendVerification}
      onSendPhoneVerification={resolvedSendVerification}
      onVerifyCode={resolvedVerifyCode}
      onUpdateEmail={resolvedNoop}
      onUpdatePhone={resolvedNoop}
      onRemoveEmail={resolvedNoop}
      onRemovePhone={resolvedNoop}
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
    const onUpdateBasicInfo = vi.fn().mockResolvedValue(undefined);
    const onUpdateProfile   = vi.fn().mockResolvedValue(undefined);

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
    const onUpdateBasicInfo = vi.fn().mockResolvedValue(undefined);
    const onUpdateProfile   = vi.fn().mockResolvedValue(undefined);

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
    const onUpdateBasicInfo = vi.fn().mockResolvedValue(undefined);
    const onUpdateProfile   = vi.fn().mockResolvedValue(undefined);

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
});
