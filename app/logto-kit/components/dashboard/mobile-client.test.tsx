import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TabId } from './types';
import type { Translations } from '../../locales';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import type { MfaVerification, LogtoSession } from '../../logic/types';

const { currentLang } = vi.hoisted(() => ({
  currentLang: { value: 'en' },
}));

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
  useLangMode: () => ({ lang: currentLang.value }),
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
    return <input aria-label="Profile draft" />;
  },
}));
vi.mock('./tabs/preferences', () => ({ PreferencesTab: () => null }));
vi.mock('./tabs/security', () => ({ SecurityTab: () => null }));
vi.mock('./tabs/sessions', () => ({
  SessionsTab: ({ onVerificationDismissed }: { onVerificationDismissed?: () => void }) => (
    <button type="button" data-testid="dismiss-sessions-verification" onClick={onVerificationDismissed}>
      Dismiss Sessions verification
    </button>
  ),
}));
vi.mock('./tabs/dev', () => ({
  DevTab: ({ onVerificationDismissed }: { onVerificationDismissed?: () => void }) => (
    <button type="button" data-testid="dismiss-dev-verification" onClick={onVerificationDismissed}>
      Dismiss Dev verification
    </button>
  ),
}));
vi.mock('./tabs/identities', () => ({ IdentitiesTab: () => null }));
vi.mock('./tabs/organizations', () => ({ OrganizationsTab: () => null }));
vi.mock('./shared/SignOutModal', () => ({ SignOutModal: () => null }));
vi.mock('./shared/Toast', () => ({ ToastContainer: () => null }));

// Mock unified toast context (MobileClient now uses useToast)
vi.mock('../providers/toast-provider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    dismissToast: vi.fn(),
    dismissAll: vi.fn(),
    mapErrorToast: vi.fn((code: string) => code),
    setSuppressAll: vi.fn(),
  }),
}));

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
    closeDashboard: 'Close dashboard',
    backToMenu: 'Back to menu',
  },
  common: { signOut: 'Sign out' },
  tabs: {
    profile: 'Profile',
    preferences: 'Preferences',
    security: 'Security',
    sessions: 'Sessions',
    identities: 'Identities',
    organizations: 'Organizations',
    dev: 'Dev',
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
  onGetPatTokens: stubDataAction as () => Promise<DataResult<import('../../logic/types').PatToken[]>>,
  onCreatePatToken: stubDataAction as () => Promise<DataResult<{ token: import('../../logic/types').PatToken; value: string }>>,
  onRenamePatToken: stubAction,
  onDeletePatToken: stubAction,
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
    currentLang.value = 'en';
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

  it('prevents overlap by making parent scrollable with bottom padding', () => {
    render(<MobileClient {...requiredProps} />);
    const mainStack = screen.getByTestId('mobile-main-stack');
    const parent = mainStack.parentElement;
    expect(parent).toHaveStyle({ overflowY: 'auto' });
  });

  it('rejects an inherited post-Flight locale and uses server translations', () => {
    currentLang.value = 'constructor';
    const inheritedTranslations = {
      ...stubTranslations,
      tabs: { ...stubTranslations.tabs, profile: 'Inherited profile' },
    };
    const allTranslations = Object.assign(
      Object.create({ constructor: inheritedTranslations }) as Record<string, Translations>,
      { en: stubTranslations },
    );

    render(<MobileClient {...requiredProps} allTranslations={allTranslations} />);

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inherited profile' })).toBeNull();
  });

  it('isolates crashing tab content with a fallback in tab view', async () => {
    shouldThrowProfileTab.value = true;

    render(<MobileClient {...requiredProps} />);

    screen.getByRole('button', { name: 'Profile' }).click();
    expect(await screen.findByText(stubTranslations.dashboard.error)).toBeInTheDocument();

    shouldThrowProfileTab.value = false;
  });

  it('preserves active tab content across a tab-menu-tab round-trip', async () => {
    render(<MobileClient {...requiredProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    const draft = screen.getByLabelText('Profile draft');
    fireEvent.change(draft, { target: { value: 'unsaved mobile edit' } });

    fireEvent.click(await screen.findByRole('button', { name: 'Back to menu' }));
    expect(screen.getByTestId('mobile-tab-view')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(await screen.findByRole('button', { name: 'Profile' }));

    expect(screen.getByLabelText('Profile draft')).toBe(draft);
    expect(screen.getByLabelText('Profile draft')).toHaveValue('unsaved mobile edit');
  });

  it('returns from Dev dismissal to the last ordinary tab instead of the menu', async () => {
    render(<MobileClient {...requiredProps} loadedTabs={['profile', 'dev']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back to menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dev' }));
    fireEvent.click(await screen.findByTestId('dismiss-dev-verification'));

    expect(screen.getByTestId('mobile-tab-view')).not.toHaveAttribute('aria-hidden');
    await waitFor(() => {
      expect(screen.getByTestId('mobile-tab-view').querySelector('[data-tab="profile"]'))
        .not.toHaveAttribute('aria-hidden');
    });
  });

  it('never falls back from Sessions dismissal to Dev', async () => {
    render(<MobileClient {...requiredProps} loadedTabs={['profile', 'dev', 'sessions']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dev' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Back to menu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sessions' }));
    fireEvent.click(await screen.findByTestId('dismiss-sessions-verification'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-tab-view').querySelector('[data-tab="profile"]'))
        .not.toHaveAttribute('aria-hidden');
      expect(screen.getByTestId('mobile-tab-view').querySelector('[data-tab="dev"]'))
        .toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('returns to the menu when Dev is the only loaded tab', () => {
    render(<MobileClient {...requiredProps} loadedTabs={['dev']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dev' }));
    fireEvent.click(screen.getByTestId('dismiss-dev-verification'));

    expect(screen.getByTestId('mobile-menu-view')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByTestId('mobile-tab-view')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Dev' })).toBeInTheDocument();
  });

  it('returns to the menu when Sessions is the only loaded tab', () => {
    render(<MobileClient {...requiredProps} loadedTabs={['sessions']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }));
    fireEvent.click(screen.getByTestId('dismiss-sessions-verification'));

    expect(screen.getByTestId('mobile-menu-view')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByTestId('mobile-tab-view')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Sessions' })).toBeInTheDocument();
  });
});
