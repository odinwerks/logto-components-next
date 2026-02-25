'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { IBM_Plex_Mono } from 'next/font/google';
import type { DashboardData, TabId, ToastMessage, UserData, MfaVerificationPayload } from './types';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import { darkColors, lightColors } from '../../themes';
import { ToastContainer } from './shared/Toast';
import { TruncatedToken } from './shared/CodeBlock';
import { ProfileTab } from './tabs/profile';
import { CustomDataTab } from './tabs/custom-data';
import { MfaTab } from './tabs/mfa';
import { IdentitiesTab } from './tabs/identities';
import { OrganizationsTab } from './tabs/organizations';
import { RawDataTab } from './tabs/raw-data';
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
    case 'identities': return t.tabs.identities;
    case 'organizations': return t.tabs.organizations;
    case 'mfa': return t.tabs.mfa;
    case 'raw': return t.tabs.raw;
    default: return (id as string).toUpperCase();
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
  onGetBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: Array<{ code: string; usedAt: string | null }> }>;
  onSignOut: () => Promise<void>;
  onRefresh: () => Promise<{ success: boolean; redirect?: string }>;
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
  onGetBackupCodes,
  onSignOut,
  onRefresh,
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch {
      showToast('error', t.dashboard.refreshFailed);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, showToast, t]);

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
    await onRefresh();
  }, [theme, persistPreferences, onRefresh]);

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
        padding: '12px',
        maxWidth: '100vw',
        margin: '0',
        backgroundColor: themeColors.bgPage,
        color: themeColors.textPrimary,
        minHeight: '100vh',
        boxSizing: 'border-box',
        fontWeight: themeColors.fontWeight,
        fontFamily: 'var(--font-ibm-plex-mono)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '6px',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: themeColors.bgPrimary,
            padding: '10px 16px',
            borderBottom: `1px solid ${themeColors.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '12px', color: themeColors.textTertiary }}>
            {t.terminal.prompt} {t.terminal.command}
          </span>
        </div>

        <div style={{ padding: '14px', background: themeColors.bgPrimary }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '13px', color: themeColors.textTertiary }}>
              [{t.dashboard.title} {t.dashboard.version}]
            </span>
            <span style={{ fontSize: '11px', color: themeColors.textTertiary, fontWeight: 'bold' }}>
              {t.dashboard.session}: {userData.id.substring(0, 12)}...
            </span>
            {isRefreshing && (
              <span style={{ fontSize: '11px', color: themeColors.accentYellow }}>
                {t.dashboard.processing}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '16px',
          alignItems: 'start',
          maxHeight: 'calc(100vh - 140px)',
          overflow: 'hidden',
        }}
      >
        {/* ── Left Sidebar ── */}
        <div
          style={{
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '6px',
            padding: '14px',
            background: themeColors.bgSecondary,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: 'calc(100vh - 140px)',
            overflowY: 'auto',
          }}
        >
          {/* Avatar Card */}
          <div
            style={{
              padding: '18px',
              background: themeColors.bgPrimary,
              border: `1px solid ${themeColors.borderColor}`,
              borderRadius: '5px',
            }}
          >
            <div style={{ color: themeColors.textTertiary, fontSize: '10px', marginBottom: '12px' }}>
              {t.sidebar.profileAvatar}
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '14px' }}>
              {/* Forced to Initials */}
              <UserBadge
                Canvas="Initials"
                userData={userData}
                themeColors={themeColors}
              />

              {/* Forced to Avatar */}
              <UserBadge
                Canvas="Avatar"
                userData={userData}
                themeColors={themeColors}
              />
            </div>

            <div style={{ color: themeColors.textTertiary, fontSize: '10px', wordBreak: 'break-all', marginBottom: '10px', textAlign: 'center' }}>
              {userData.avatar
                ? userData.avatar.substring(0, 40) + '...'
                : 'No avatar URL'}
            </div>
          </div>

          {/* Access Token */}
          <div>
            <div style={{ color: themeColors.textTertiary, fontSize: '10px', marginBottom: '6px' }}>
              {tokenPrefix}_{t.sidebar.token}
            </div>
            <TruncatedToken token={accessToken} themeColors={themeColors} t={t} />
          </div>

          {/* User ID */}
          <div
            style={{
              padding: '10px',
              background: themeColors.bgPrimary,
              border: `1px solid ${themeColors.borderColor}`,
              borderRadius: '4px',
            }}
          >
            <div style={{ color: themeColors.textTertiary, fontSize: '10px', marginBottom: '6px' }}>
              {t.sidebar.userId}
            </div>
            <div style={{ color: themeColors.textPrimary, fontSize: '12px', wordBreak: 'break-all' }}>
              {userData.id}
            </div>
          </div>

          {/* Last Login */}
          <div
            style={{
              padding: '10px',
              background: themeColors.bgPrimary,
              border: `1px solid ${themeColors.borderColor}`,
              borderRadius: '4px',
            }}
          >
            <div style={{ color: themeColors.textTertiary, fontSize: '10px', marginBottom: '6px' }}>
              {t.sidebar.lastLogin}
            </div>
            <div style={{ color: themeColors.textPrimary, fontSize: '12px' }}>
              {formatDate(userData.lastSignInAt)}
            </div>
          </div>

          {/* ── Language List (under last login) ── */}
          {hasMultipleLangs && (
            <div
              style={{
                padding: '10px',
                background: themeColors.bgPrimary,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '4px',
              }}
            >
              <div style={{ color: themeColors.textTertiary, fontSize: '10px', marginBottom: '8px' }}>
                {t.dashboard.availableLangs}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {supportedLangs.map((code) => (
                  <div
                    key={code}
                    onClick={async () => {
                      if (code !== lang) {
                        setLang(code);
                        await persistPreferences({ lang: code });
                        await onRefresh();
                      }
                    }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      cursor: code !== lang ? 'pointer' : 'default',
                      background: code === lang ? themeColors.bgTertiary : 'transparent',
                      color: code === lang ? themeColors.accentGreen : themeColors.textSecondary,
                      border: `1px solid ${code === lang ? themeColors.accentGreen : 'transparent'}`,
                      transition: 'all 0.15s',
                      userSelect: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ opacity: code === lang ? 1 : 0, fontSize: '9px' }}>●</span>
                    {code}
                    {code === lang && (
                      <span style={{ marginLeft: 'auto', fontSize: '9px', opacity: 0.6 }}>{t.sidebar.active}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div
            style={{
              padding: '14px',
              background: themeColors.bgPrimary,
              border: `1px solid ${themeColors.borderColor}`,
              borderRadius: '4px',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '8px 6px',
                background: themeColors.bgTertiary,
                color: themeColors.textPrimary,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--font-ibm-plex-mono)',
                whiteSpace: 'nowrap',
              }}
            >
              {theme === 'dark' ? t.sidebar.lightMode : t.sidebar.darkMode}
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '8px 6px',
                background: themeColors.accentRed,
                color: '#fee2e2',
                border: `1px solid ${themeColors.accentRed}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--font-ibm-plex-mono)',
                whiteSpace: 'nowrap',
              }}
            >
              {t.dashboard.signOut}
            </button>
          </div>
        </div>

        {/* ── Right Content Panel ── */}
        <div
          style={{
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '6px',
            overflow: 'hidden',
            background: themeColors.bgSecondary,
            maxHeight: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${themeColors.borderColor}`,
              background: themeColors.bgPrimary,
              overflowX: 'auto',
            }}
          >
            {loadedTabs.map((tabId) => (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                style={{
                  flex: 1,
                  minWidth: 'fit-content',
                  padding: '10px 12px',
                  background: activeTab === tabId ? themeColors.bgSecondary : themeColors.bgPrimary,
                  color: activeTab === tabId ? themeColors.textPrimary : themeColors.textTertiary,
                  border: 'none',
                  borderRight: `1px solid ${themeColors.borderColor}`,
                  borderBottom: activeTab === tabId ? `2px solid ${themeColors.accentGreen}` : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  outline: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                <span style={{ opacity: 0.5 }}>{TAB_ICON}</span>
                {getTabLabel(tabId, t)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            style={{
              padding: '14px',
              background: themeColors.bgPrimary,
              overflowY: 'auto',
              flex: 1,
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
              />
            )}

            {activeTab === 'mfa' && (
              <MfaTab
                userData={userData}
                themeColors={themeColors}
                t={t}
                onGetMfaVerifications={onGetMfaVerifications}
                onGenerateTotpSecret={onGenerateTotpSecret}
                onAddMfaVerification={onAddMfaVerification}
                onDeleteMfaVerification={onDeleteMfaVerification}
                onGenerateBackupCodes={onGenerateBackupCodes}
                onGetBackupCodes={onGetBackupCodes}
                onVerifyPassword={onVerifyPassword}
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
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '12px',
          padding: '8px',
          color: themeColors.textTertiary,
          fontSize: '10px',
          background: themeColors.bgSecondary,
          borderRadius: '4px',
          border: `1px solid ${themeColors.borderColor}`,
        }}
      >
        <div>{t.dashboard.systemMessage}</div>
      </div>

      {/* ── Toasts ── */}
      <ToastContainer messages={toasts} onDismiss={dismissToast} themeColors={themeColors} />
    </div>
  );
}