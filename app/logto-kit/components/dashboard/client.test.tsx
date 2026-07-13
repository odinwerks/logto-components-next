import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import type { DashboardData, TabId } from './types';
import type { Translations } from '../../locales';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import type { MfaVerification, LogtoSession } from '../../logic/types';

// ── Hoisted mocks ──────────────────────────────────────────
const {
  mockUserBadge,
  shouldThrowProfileTab,
} = vi.hoisted(() => ({
  mockUserBadge: vi.fn<(props: Record<string, unknown>) => null>(() => null),
  shouldThrowProfileTab: { value: false },
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
vi.mock('./tabs/profile', () => ({
  ProfileTab: () => {
    if (shouldThrowProfileTab.value) {
      throw new Error('profile render crash');
    }
    const [value, setValue] = useState('');
    return (
      <input
        data-testid="profile-draft-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  },
}));
vi.mock('./tabs/preferences', () => ({ PreferencesTab: () => null }));
vi.mock('./tabs/security', () => ({ SecurityTab: () => null }));
vi.mock('./tabs/sessions', () => ({ SessionsTab: () => null }));
vi.mock('./tabs/identities', () => ({ IdentitiesTab: () => null }));
vi.mock('./tabs/organizations', () => ({ OrganizationsTab: () => null }));
vi.mock('./shared/SignOutModal', () => ({ SignOutModal: () => null }));
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

afterEach(() => {
  vi.useRealTimers();
});

describe('DashboardClient - userShape prop', () => {
  beforeEach(() => {
    mockUserBadge.mockClear();
    vi.mocked(readEnv).mockClear();
    shouldThrowProfileTab.value = false;
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

  it('renders tab content without crashing', () => {
    const { container } = render(<DashboardClient {...requiredProps} />);
    // Animations are now driven by Framer Motion (CrossFade). Verify the
    // component renders without errors.
    expect(container.firstChild).not.toBeNull();
  });

  it('does not remount the tabpanel wrapper when switching tabs (BUG-010)', () => {
    // The fade wrapper used to carry `key={activeTab}`, which forced the entire
    // subtree (including form drafts and verification state) to unmount/remount
    // on every tab change. After the fix the wrapper element is preserved across
    // tab switches — only its conditional children swap.
    render(
      <DashboardClient
        {...requiredProps}
        loadedTabs={['profile', 'security', 'sessions']}
      />,
    );

    const panel = screen.getByRole('tabpanel');
    const wrapperBefore = panel.querySelector('.dashboard-tabpanel-content');
    expect(wrapperBefore).not.toBeNull();

    // Switch to Security tab.
    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));
    // The same panel element should still be in the DOM (never remounted).
    expect(screen.getByRole('tabpanel')).toBe(panel);
    // The fade wrapper must still be present (it was not keyed away).
    const wrapperAfter = screen.getByRole('tabpanel').querySelector('.dashboard-tabpanel-content');
    expect(wrapperAfter).not.toBeNull();

    // Switch back to Profile tab and re-check the wrapper identity.
    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));
    expect(screen.getByRole('tabpanel').querySelector('.dashboard-tabpanel-content')).not.toBeNull();
  });

  it('preserves tab form state across tab switches (BUG A — keyed fade wrapper regression)', () => {
    // The profile tab mock exposes a controlled input. Typing into it and
    // switching tabs should NOT reset the value — the component must stay
    // mounted (hidden via display:none, not unmounted) during the switch.
    vi.useFakeTimers();

    render(
      <DashboardClient
        {...requiredProps}
        loadedTabs={['profile', 'security']}
      />,
    );

    // Type a draft into the profile input.
    const input = screen.getByTestId('profile-draft-input');
    fireEvent.change(input, { target: { value: 'my draft' } });
    expect(input).toHaveValue('my draft');

    // Switch to Security tab — triggers crossfade (isFading → timeout).
    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));

    // Advance past the 50ms fade-out timer so displayedTab updates.
    act(() => {
      vi.advanceTimersByTime(80);
    });

    // The profile input must still exist in the DOM (hidden, not unmounted).
    expect(screen.getByTestId('profile-draft-input')).toBeInTheDocument();

    // Switch back to Profile tab.
    fireEvent.click(screen.getByRole('tab', { name: 'Profile' }));

    act(() => {
      vi.advanceTimersByTime(80);
    });

    // The draft value must survive the round-trip.
    expect(screen.getByTestId('profile-draft-input')).toHaveValue('my draft');
  });

  it('fades the outgoing tab out then reveals the incoming tab (CrossFade)', () => {
    // Regression guard for the state-preserving crossfade: the outgoing panel
    // stays visible (fading out) during the fade-out phase, then the incoming
    // panel is revealed. Replaces the legacy ldd-tab-fade-out/in class checks
    // — Framer Motion drives the opacity; we assert the display toggling that
    // gates which panel is interactive.
    vi.useFakeTimers();

    render(
      <DashboardClient
        {...requiredProps}
        loadedTabs={['profile', 'security']}
      />,
    );

    const panel = screen.getByRole('tabpanel');
    const profileWrapper = panel.querySelector('[data-tab="profile"]') as HTMLElement;
    // Initial state: profile is displayed; security not yet visited.
    expect(profileWrapper).not.toHaveStyle({ display: 'none' });
    expect(panel.querySelector('[data-tab="security"]')).toBeNull();

    // Click Security tab — triggers the fade-out phase on the outgoing tab.
    fireEvent.click(screen.getByRole('tab', { name: 'Security' }));

    // During fade-out (before timeout): outgoing tab still visible (fading
    // out), incoming tab rendered but hidden via display:none.
    expect(panel.querySelector('[data-tab="profile"]')).not.toHaveStyle({ display: 'none' });
    const securityWrapper = panel.querySelector('[data-tab="security"]') as HTMLElement;
    expect(securityWrapper).toBeInTheDocument();
    expect(securityWrapper).toHaveStyle({ display: 'none' });

    // Advance past the fade-out timer.
    act(() => {
      vi.advanceTimersByTime(80);
    });

    // After timeout: incoming tab is revealed, outgoing is hidden.
    expect(securityWrapper).not.toHaveStyle({ display: 'none' });
    expect(profileWrapper).toHaveStyle({ display: 'none' });
  });

  it('links all tabs to one stable tabpanel id with roving tabIndex', () => {
    render(
      <DashboardClient
        {...requiredProps}
        loadedTabs={['profile', 'security', 'sessions']}
      />,
    );

    const profileTab = screen.getByRole('tab', { name: 'Profile' });
    const securityTab = screen.getByRole('tab', { name: 'Security' });
    const sessionsTab = screen.getByRole('tab', { name: 'Sessions' });

    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(profileTab).toHaveAttribute('tabindex', '0');
    expect(profileTab).toHaveAttribute('aria-controls', 'dashboard-tabpanel');

    expect(securityTab).toHaveAttribute('aria-selected', 'false');
    expect(securityTab).toHaveAttribute('tabindex', '-1');
    expect(securityTab).toHaveAttribute('aria-controls', 'dashboard-tabpanel');

    expect(sessionsTab).toHaveAttribute('aria-selected', 'false');
    expect(sessionsTab).toHaveAttribute('tabindex', '-1');
    expect(sessionsTab).toHaveAttribute('aria-controls', 'dashboard-tabpanel');

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', 'dashboard-tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-profile');
  });

  it('supports ArrowRight, End, and Home keyboard navigation in tabs', () => {
    render(
      <DashboardClient
        {...requiredProps}
        loadedTabs={['profile', 'security', 'sessions']}
      />,
    );

    const profileTab = screen.getByRole('tab', { name: 'Profile' });
    const securityTab = screen.getByRole('tab', { name: 'Security' });
    const sessionsTab = screen.getByRole('tab', { name: 'Sessions' });

    profileTab.focus();
    fireEvent.keyDown(profileTab, { key: 'ArrowRight' });
    expect(securityTab).toHaveAttribute('aria-selected', 'true');
    expect(securityTab).toHaveFocus();

    fireEvent.keyDown(securityTab, { key: 'End' });
    expect(sessionsTab).toHaveAttribute('aria-selected', 'true');
    expect(sessionsTab).toHaveFocus();

    fireEvent.keyDown(sessionsTab, { key: 'Home' });
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(profileTab).toHaveFocus();
  });

  it('supports ArrowDown and ArrowUp keyboard navigation in tabs', () => {
    render(
      <DashboardClient
        {...requiredProps}
        loadedTabs={['profile', 'security', 'sessions']}
      />,
    );

    const profileTab = screen.getByRole('tab', { name: 'Profile' });
    const securityTab = screen.getByRole('tab', { name: 'Security' });

    profileTab.focus();
    fireEvent.keyDown(profileTab, { key: 'ArrowDown' });
    expect(securityTab).toHaveAttribute('aria-selected', 'true');
    expect(securityTab).toHaveFocus();

    fireEvent.keyDown(securityTab, { key: 'ArrowUp' });
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(profileTab).toHaveFocus();
  });

  it('isolates crashing tab content with an in-panel fallback', () => {
    shouldThrowProfileTab.value = true;

    render(<DashboardClient {...requiredProps} />);

    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    expect(screen.getByText(stubTranslations.dashboard.error)).toBeInTheDocument();
  });
});
