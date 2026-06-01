import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { DashboardData, TabId } from './types';
import type { Translations } from '../../locales';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import type { MfaVerification, LogtoSession } from '../../logic/types';

// ── Hoisted mocks ──────────────────────────────────────────
const { mockUserBadge } = vi.hoisted(() => ({
  mockUserBadge: vi.fn<(props: Record<string, unknown>) => null>(() => null),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('next/font/google', () => ({
  IBM_Plex_Mono: () => ({ className: 'ibm-plex-mono', style: {} }),
}));

vi.mock('../UserButton', () => ({
  UserBadge: (props: Record<string, unknown>) => mockUserBadge(props),
}));

vi.mock('../providers/preferences', () => ({
  useThemeMode: () => ({
    mode: 'dark' as const,
    colors: {
      bgPage: '#000',
      bgSecondary: '#111',
      borderColor: '#333',
      textPrimary: '#fff',
      textTertiary: '#999',
      accentBlue: '#4a9eff',
      bgOverlay: 'rgba(0,0,0,0.5)',
      danger: '#ef4444',
      success: '#22c55e',
    },
  }),
  useLangMode: () => ({ lang: 'en' }),
}));

vi.mock('../providers/user-data-context', () => ({
  useUserDataContext: () => null,
}));

// Mock env - after the fix, readEnv should NOT be called during render
vi.mock('../../logic/env', () => ({
  readEnv: vi.fn(() => undefined),
}));

// Mock all tab sub-components to avoid deep rendering
vi.mock('./tabs/profile', () => ({ ProfileTab: () => null }));
vi.mock('./tabs/preferences', () => ({ PreferencesTab: () => null }));
vi.mock('./tabs/security', () => ({ SecurityTab: () => null }));
vi.mock('./tabs/sessions', () => ({ SessionsTab: () => null }));
vi.mock('./tabs/identities', () => ({ IdentitiesTab: () => null }));
vi.mock('./tabs/organizations', () => ({ OrganizationsTab: () => null }));
vi.mock('./tabs/dev', () => ({ DevTab: () => null }));
vi.mock('./shared/Toast', () => ({ ToastContainer: () => null }));

// Import after mocks
import { DashboardClient } from './client';
import { readEnv } from '../../logic/env';

// ── Minimal stub data ──────────────────────────────────────
const stubUserData: import('../../logic/types').UserData = {
  id: 'test-user',
  username: 'testuser',
  name: 'Test User',
  avatar: undefined,
  primaryEmail: 'test@example.com',
  primaryPhone: undefined,
  profile: { givenName: 'Test', familyName: 'User' },
  identities: {},
  customData: {},
  createdAt: 0,
  updatedAt: 0,
};

const stubTranslations = {
  dashboard: {
    account: 'Account',
    error: 'Error',
    loadFailed: 'Failed to load',
    defaultUserName: 'User',
  },
  common: { signOut: 'Sign out' },
  tabs: {
    profile: 'Profile',
    preferences: 'Preferences',
    security: 'Security',
    sessions: 'Sessions',
    identities: 'Identities',
    organizations: 'Organizations',
    dev: 'Developer',
  },
  profile: { notSet: 'Not set' },
} as Translations;

const stubInitialData: DashboardData = {
  userData: stubUserData,
};

// Stub action handlers
const stubAction = async () => ({ ok: true } as ActionResult);
const stubDataAction = async () => ({ ok: true, data: {} });

const requiredProps = {
  initialData: stubInitialData,
  translations: stubTranslations,
  allTranslations: { en: stubTranslations },
  supportedLangs: ['en'],
  loadedTabs: ['profile'] as TabId[],
  onUpdateBasicInfo: stubAction,
  onUpdateAvatarUrl: stubAction,
  onUpdateProfile: stubAction,
  onVerifyPassword: stubDataAction as () => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>,
  onSendEmailVerification: stubDataAction as () => Promise<DataResult<{ verificationId: string }>>,
  onSendPhoneVerification: stubDataAction as () => Promise<DataResult<{ verificationId: string }>>,
  onVerifyCode: stubDataAction as () => Promise<DataResult<{ verificationRecordId: string }>>,
  onUpdateEmail: stubAction,
  onUpdatePhone: stubAction,
  onRemoveEmail: stubAction,
  onRemovePhone: stubAction,
  onGetMfaVerifications: stubDataAction as () => Promise<DataResult<MfaVerification[]>>,
  onGenerateTotpSecret: stubDataAction as () => Promise<DataResult<{ secret: string }>>,
  onAddMfaVerification: stubAction,
  onDeleteMfaVerification: stubAction,
  onReplaceTotpVerification: stubAction,
  onGenerateBackupCodes: stubDataAction as () => Promise<DataResult<{ codes: string[] }>>,
  onUpdatePassword: stubAction,
  onDeleteAccount: stubAction,
  onRequestWebAuthnRegistration: stubDataAction as () => Promise<DataResult<{ registrationOptions: unknown; verificationRecordId: string }>>,
  onVerifyAndLinkWebAuthn: stubAction,
  onRenamePasskey: stubAction,
  onGetSessionsWithDeviceMeta: stubDataAction as () => Promise<DataResult<LogtoSession[]>>,
  onRevokeSession: stubAction,
  onRevokeAllOtherSessions: stubAction,
  onSignOut: async () => {},
};

describe('DashboardClient - userShape prop', () => {
  beforeEach(() => {
    mockUserBadge.mockClear();
    vi.mocked(readEnv).mockClear();
  });

  it('renders with userShape prop and passes it to UserBadge', () => {
    render(<DashboardClient {...requiredProps} userShape="sq" />);

    expect(mockUserBadge).toHaveBeenCalled();

    // Find the call that has a shape prop matching our value
    const shapeCalls = mockUserBadge.mock.calls.filter(
      ([props]) => props.shape === 'sq'
    );
    expect(shapeCalls.length).toBeGreaterThan(0);
  });

  it('passes "circle" as default userShape when prop is omitted', () => {
    render(<DashboardClient {...requiredProps} />);

    expect(mockUserBadge).toHaveBeenCalled();

    // Should default to circle
    const circleCalls = mockUserBadge.mock.calls.filter(
      ([props]) => props.shape === 'circle'
    );
    expect(circleCalls.length).toBeGreaterThan(0);
  });

  it('does NOT call readEnv during render (env values come via props now)', () => {
    render(<DashboardClient {...requiredProps} userShape="rsq" />);

    // readEnv should not have been called anywhere in the component
    expect(readEnv).not.toHaveBeenCalled();
  });

  it('renders @keyframes fadeIn style for tab animations', () => {
    const { container } = render(<DashboardClient {...requiredProps} />);

    const styleEl = container.querySelector('style');
    expect(styleEl).not.toBeNull();
    expect(styleEl!.textContent).toContain('@keyframes fadeIn');
    expect(styleEl!.textContent).toContain('from { opacity: 0');
    expect(styleEl!.textContent).toContain('to { opacity: 1');
  });
});
