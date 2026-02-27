'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IBM_Plex_Mono } from 'next/font/google';
import type { DashboardData, TabId, ToastMessage, UserData, MfaVerificationPayload } from './types';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import { darkColors, lightColors } from '../../themes';
import { ToastContainer } from './shared/Toast';
import { TruncatedToken } from './shared/CodeBlock';
import { ProfileTab } from './tabs/profile';
import { CustomDataTab } from './tabs/custom-data';
import { SecurityTab } from './tabs/security';
import { IdentitiesTab } from './tabs/identities';
import { OrganizationsTab } from './tabs/organizations';
import { RawDataTab } from './tabs/raw-data';
import { PreferencesTab } from './tabs/preferences';
import { getPreferencesFromUserData, buildUpdatedCustomData } from '../../logic/preferences';
import { UserBadge } from '../userbutton';

// Import MfaVerification type
import type { MfaVerification } from '../../logic/types';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

// ─────────────────────────────────────────────────────────────────────────────
// Tab metadata
// ─────────────────────────────────────────────────────────────────────────────

const TAB_ICON = '›';

function getTabLabel(id: TabId, t: Translations): string {
  switch (id) {
    case 'profile': return t.tabs.profile;
    case 'custom-data': return t.tabs.customData;
    case 'security': return t.tabs.security;
    case 'identities': return t.tabs.identities;
    case 'organizations': return t.tabs.organizations;
    case 'raw': return t.tabs.raw;
    case 'preferences': return t.tabs.preferences;
    default: return (id as string).toUpperCase();
  }
}

// Icons for sidebar navigation
const UserIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const ShieldIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <path d="M12 3L4 7v5c0 5 3.5 9 8 10 4.5-1 8-5 8-10V7L12 3z" />
  </svg>
);

const LinkIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <path d="M9 17H7a5 5 0 0 1 0-10h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const BuildingIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <rect x="3" y="9" width="5" height="12" />
    <rect x="9" y="5" width="6" height="16" />
    <rect x="16" y="12" width="5" height="9" />
  </svg>
);

const SettingsIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoutIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function getTabIcon(id: TabId) {
  switch (id) {
    case 'profile': return UserIcon;
    case 'security': return ShieldIcon;
    case 'identities': return LinkIcon;
    case 'organizations': return BuildingIcon;
    case 'preferences': return SettingsIcon;
    default: return UserIcon;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  initialData: DashboardData;
  translations: Translations;
  allTranslations: Record<string, Translations>;
  supportedLangs: string[];
  initialLang: string;
  loadedTabs: TabId[];
  initialTheme?: 'dark' | 'light';

  onUpdateBasicInfo: (updates: { name?: string; username?: string }) => Promise<void>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<void>;
  onUpdateProfile: (profile: { givenName?: string; familyName?: string }) => Promise<void>;
  onUpdateCustomData: (customData: Record<string, unknown>) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSendEmailVerification: (email: string) => Promise<{ verificationId: string }>;
  onSendPhoneVerification: (phone: string) => Promise<{ verificationId: string }>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<{ verificationRecordId: string }>;
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onRemoveEmail: (identityVerificationRecordId: string) => Promise<void>;
  onRemovePhone: (identityVerificationRecordId: string) => Promise<void>;
  onGetMfaVerifications: () => Promise<Array<MfaVerification>>;
  onGenerateTotpSecret: () => Promise<{ secret: string; secretQrCode: string }>;
  onAddMfaVerification: (verification: MfaVerificationPayload, identityVerificationRecordId: string) => Promise<void>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string) => Promise<void>;
  onGenerateBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: string[] }>;
  onUpdatePassword: (newPassword: string, identityVerificationRecordId: string) => Promise<void>;
  onDeleteAccount: (identityVerificationRecordId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardClient({
  initialData,
  translations: serverTranslations,
  allTranslations,
  supportedLangs,
  initialLang,
  loadedTabs,
  initialTheme = 'dark',
  onUpdateBasicInfo,
  onUpdateAvatarUrl,
  onUpdateProfile,
  onUpdateCustomData,
  onVerifyPassword,
  onSendEmailVerification,
  onSendPhoneVerification,
  onVerifyCode,
  onUpdateEmail,
  onUpdatePhone,
  onRemoveEmail,
  onRemovePhone,
  onGetMfaVerifications,
  onGenerateTotpSecret,
  onAddMfaVerification,
  onDeleteMfaVerification,
  onGenerateBackupCodes,
  onUpdatePassword,
  onDeleteAccount,
  onSignOut,
}: DashboardClientProps) {

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);
  const themeColors = useMemo<ThemeColors>(() => (theme === 'dark' ? darkColors : lightColors), [theme]);

  // ── Language ───────────────────────────────────────────────────────────────
  const [lang, setLang] = useState<string>(initialLang);
  const t = useMemo<Translations>(
    () => allTranslations[lang] ?? serverTranslations,
    [lang, allTranslations, serverTranslations]
  );

  // ── User Data ──────────────────────────────────────────────────────────────
  const [userData, setUserData] = useState<UserData>(initialData.userData);
  const [accessToken, setAccessToken] = useState<string>(initialData.accessToken);

  useEffect(() => {
    setUserData(initialData.userData);
    setAccessToken(initialData.accessToken);
  }, [initialData]);

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>(loadedTabs[0] ?? 'profile');

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const toast: ToastMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      duration: type === 'success' ? 3000 : 5000,
    };
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Refresh ────────────────────────────────────────────────────────────────
  // router.refresh() re-fetches the RSC payload for the current route,
  // bypassing the Data Cache. This re-runs Dashboard (which calls fetchDashboardData)
  // and all server components, giving the client fresh user data.
  // No server action needed — onRefresh/revalidatePath was redundant here.
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  // ── Preferences persistence ────────────────────────────────────────────────
  const prefSyncedRef = useRef(false);
  const userDataRef = useRef(userData);
  userDataRef.current = userData;

  const themeRef = useRef<'dark' | 'light'>(initialTheme);
  const langRef = useRef<string>(initialLang);
  themeRef.current = theme;
  langRef.current = lang;

  const persistPreferences = useCallback(
    async (updates: Partial<{ theme: 'dark' | 'light'; lang: string }>) => {
      const complete = {
        theme: updates.theme ?? themeRef.current,
        lang:  updates.lang  ?? langRef.current,
      };
      try {
        const updated = buildUpdatedCustomData(userDataRef.current, complete);
        await onUpdateCustomData(updated);
      } catch (err) {
        console.error('[preferences] Failed to persist:', err);
      }
    },
    [onUpdateCustomData]
  );

  useEffect(() => {
    if (prefSyncedRef.current) return;
    prefSyncedRef.current = true;

    const prefs = getPreferencesFromUserData(userData);

    if (prefs) {
      let shouldPersist = false;

      if (prefs.theme && prefs.theme !== initialTheme) {
        setTheme(prefs.theme);
      }

      if (prefs.lang && supportedLangs.includes(prefs.lang) && prefs.lang !== initialLang) {
        setLang(prefs.lang);
      }

      if (prefs.lang && !supportedLangs.includes(prefs.lang)) {
        shouldPersist = true;
      }

      if (shouldPersist) {
        persistPreferences({ theme: prefs.theme, lang: supportedLangs[0] });
      }
    } else {
      persistPreferences({ theme: initialTheme, lang: initialLang });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await persistPreferences({ theme: next });
    router.refresh();
  }, [theme, persistPreferences, router]);

  const handleThemeChange = useCallback(async (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    await persistPreferences({ theme: newTheme });
    router.refresh();
  }, [persistPreferences, router]);

  const handleLangChange = useCallback(async (code: string) => {
    setLang(code);
    await persistPreferences({ lang: code });
    router.refresh();
  }, [persistPreferences, router]);

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    try {
      await onSignOut();
    } catch {
      showToast('error', t.dashboard.signOutFailed);
    }
  }, [onSignOut, showToast, t]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDate = useCallback((timestamp?: number | string) => {
    if (!timestamp) return t.common.notAvailable;
    try {
      let date: Date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        date = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return t.common.invalidDate;
    }
  }, [t]);

  const isJwt = accessToken.split('.').length === 3;
  const tokenPrefix = isJwt ? 'JWT' : 'OPAQUE';
  const hasMultipleLangs = supportedLangs.length > 1;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className={ibmPlexMono.className}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        backgroundColor: themeColors.bgPage,
        color: themeColors.textPrimary,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-ibm-plex-mono)',
      }}
    >
      {/* Centered Modal */}
      <div
        style={{
          width: '100%',
          maxWidth: 990,
          height: 660,
          display: 'flex',
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          boxShadow: '0 32px 90px rgba(0,0,0,0.65)',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 224,
            height: '100%',
            background: themeColors.bgPage,
            borderRight: `1px solid ${themeColors.borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          {/* User Block */}
          <div style={{ padding: '16px 14px 15px', borderBottom: `1px solid ${themeColors.borderColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserBadge userData={userData} themeColors={themeColors} Size="32px" Canvas="Avatar" shape="sq" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontWeight: 600,
                    fontSize: 13,
                    color: themeColors.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userData.profile?.givenName ?? 'User'}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontSize: 10,
                    color: themeColors.textTertiary,
                    marginTop: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userData.primaryEmail || userData.username || t.profile.notSet}
                </p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '10px 8px 6px', overflowY: 'auto' }}>
            <p
              style={{
                fontFamily: 'var(--font-ibm-plex-mono)',
                fontWeight: 600,
                fontSize: 10,
                color: themeColors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                padding: '4px 10px 8px',
              }}
            >
              Account
            </p>
            {loadedTabs.map((tabId) => {
              const Icon = getTabIcon(tabId);
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    width: '100%',
                    padding: '7px 10px',
                    background: isActive ? themeColors.bgSecondary : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${isActive ? themeColors.accentBlue : 'transparent'}`,
                    color: isActive ? themeColors.textPrimary : themeColors.textTertiary,
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: 2,
                  }}
                >
                  <Icon size={13} color={isActive ? themeColors.accentBlue : themeColors.textTertiary} />
                  {getTabLabel(tabId, t)}
                </button>
              );
            })}
          </nav>

          {/* Sign Out */}
          <div style={{ padding: '6px 8px 12px', borderTop: `1px solid ${themeColors.borderColor}` }}>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                width: '100%',
                padding: '7px 10px',
                background: 'transparent',
                border: 'none',
                borderLeft: '2px solid transparent',
                color: themeColors.textTertiary,
                fontFamily: 'var(--font-ibm-plex-mono)',
                fontWeight: 500,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              >
              <LogoutIcon size={13} />
              {t.common.signOut}
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: '28px 32px',
            overflowY: 'auto',
            height: '100%',
          }}
        >
          {activeTab === 'profile' && (
            <ProfileTab
              userData={userData}
              themeColors={themeColors}
              t={t}
              onUpdateBasicInfo={onUpdateBasicInfo}
              onUpdateAvatarUrl={onUpdateAvatarUrl}
              onUpdateProfile={onUpdateProfile}
              onVerifyPassword={onVerifyPassword}
              onSendEmailVerification={onSendEmailVerification}
              onSendPhoneVerification={onSendPhoneVerification}
              onVerifyCode={onVerifyCode}
              onUpdateEmail={onUpdateEmail}
              onUpdatePhone={onUpdatePhone}
              onRemoveEmail={onRemoveEmail}
              onRemovePhone={onRemovePhone}
              onSuccess={(msg) => showToast('success', msg)}
              onError={(msg) => showToast('error', msg)}
              refreshData={refreshData}
            />
          )}

          {activeTab === 'custom-data' && (
            <CustomDataTab
              userData={userData}
              themeColors={themeColors}
              t={t}
              onUpdateCustomData={onUpdateCustomData}
              onSuccess={(msg) => showToast('success', msg)}
              onError={(msg) => showToast('error', msg)}
              refreshData={refreshData}
              theme={theme}
              lang={lang}
              supportedLangs={supportedLangs}
              onThemeChange={handleThemeChange}
              onLangChange={handleLangChange}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              userData={userData}
              themeColors={themeColors}
              t={t}
              onVerifyPassword={onVerifyPassword}
              onSendEmailVerification={onSendEmailVerification}
              onSendPhoneVerification={onSendPhoneVerification}
              onVerifyCode={onVerifyCode}
              onUpdateEmail={onUpdateEmail}
              onUpdatePhone={onUpdatePhone}
              onRemoveEmail={onRemoveEmail}
              onRemovePhone={onRemovePhone}
              onGetMfaVerifications={onGetMfaVerifications}
              onGenerateTotpSecret={onGenerateTotpSecret}
              onAddMfaVerification={onAddMfaVerification}
              onDeleteMfaVerification={onDeleteMfaVerification}
              onGenerateBackupCodes={onGenerateBackupCodes}
              onUpdatePassword={onUpdatePassword}
              onDeleteAccount={onDeleteAccount}
              onSuccess={(msg) => showToast('success', msg)}
              onError={(msg) => showToast('error', msg)}
            />
          )}

          {activeTab === 'identities' && (
            <IdentitiesTab userData={userData} themeColors={themeColors} t={t} />
          )}

          {activeTab === 'organizations' && (
            <OrganizationsTab userData={userData} themeColors={themeColors} t={t} />
          )}

          {activeTab === 'raw' && (
            <RawDataTab userData={userData} themeColors={themeColors} t={t} />
          )}

          {activeTab === 'preferences' && (
            <PreferencesTab
              theme={theme}
              lang={lang}
              supportedLangs={supportedLangs}
              themeColors={themeColors}
              t={t}
              onThemeChange={handleThemeChange}
              onLangChange={handleLangChange}
            />
          )}
        </div>
      </div>

      {/* Toasts */}
      <ToastContainer messages={toasts} onDismiss={dismissToast} themeColors={themeColors} />
    </div>
  );
}

// Alias export for modal usage
export { DashboardClient as UserProfile };