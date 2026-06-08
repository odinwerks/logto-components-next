import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { TabId } from './types';
import type { Translations } from '../../locales';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import type { MfaVerification, LogtoSession } from '../../logic/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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

vi.mock('../providers/logto-provider', () => ({
  useLogto: () => ({ closeDashboard: vi.fn() }),
}));

const { shouldThrowProfileTab } = vi.hoisted(() => ({
  shouldThrowProfileTab: { value: false },
}));

vi.mock('./tabs/profile', () => ({
  ProfileTab: () => {
    if (shouldThrowProfileTab.value) {
      throw new Error('mobile profile crash');
    }
    return null;
  },
}));
vi.mock('./tabs/preferences', () => ({ PreferencesTab: () => null }));
vi.mock('./tabs/security', () => ({ SecurityTab: () => null }));
vi.mock('./tabs/sessions', () => ({ SessionsTab: () => null }));
vi.mock('./tabs/identities', () => ({ IdentitiesTab: () => null }));
vi.mock('./tabs/organizations', () => ({ OrganizationsTab: () => null }));
vi.mock('./shared/Toast', () => ({ ToastContainer: () => null }));

import { MobileClient } from './mobile-client';

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
  },
  profile: { notSet: 'Not set' },
  validation: { phoneCountryNotAllowed: 'Country not allowed' },
} as Translations;

const stubAction = async () => ({ ok: true } as ActionResult);
const stubDataAction = async () => ({ ok: true, data: {} });

const requiredProps = {
  initialData: { userData: stubUserData },
  translations: stubTranslations,
  allTranslations: { en: stubTranslations },
  supportedLangs: ['en'],
  loadedTabs: ['profile', 'security'] as TabId[],
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

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('MobileClient menu layout', () => {
  beforeEach(() => {
    shouldThrowProfileTab.value = false;
  });

  it('renders sign-out in a separate dock container from the centered tab stack', () => {
    render(<MobileClient {...requiredProps} />);

    const mainStack = screen.getByTestId('mobile-main-stack');
    const signOutDock = screen.getByTestId('mobile-signout-dock');

    const profileButton = screen.getByRole('button', { name: 'Profile' });
    const signOutButton = screen.getByRole('button', { name: 'Sign out' });

    expect(mainStack).toContainElement(profileButton);
    expect(mainStack).not.toContainElement(signOutButton);
    expect(signOutDock).toContainElement(signOutButton);

    expect(signOutButton.style.padding).toBe(profileButton.style.padding);
    expect(signOutButton.style.fontSize).toBe(profileButton.style.fontSize);
    expect(signOutButton.style.fontWeight).toBe(profileButton.style.fontWeight);
  });

  it('applies safe-area-aware bottom spacing for the sign-out dock', () => {
    render(<MobileClient {...requiredProps} />);

    const signOutDock = screen.getByTestId('mobile-signout-dock');
    expect(signOutDock.style.bottom).toContain('safe-area-inset-bottom');
    expect(signOutDock.style.bottom).toContain('6rem');
  });

  it('isolates crashing tab content with a fallback in tab view', async () => {
    shouldThrowProfileTab.value = true;

    render(<MobileClient {...requiredProps} />);

    screen.getByRole('button', { name: 'Profile' }).click();
    expect(await screen.findByText(stubTranslations.dashboard.error)).toBeInTheDocument();

    shouldThrowProfileTab.value = false;
  });
});
