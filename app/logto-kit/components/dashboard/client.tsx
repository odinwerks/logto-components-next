'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IBM_Plex_Mono } from 'next/font/google';
import type { DashboardData, TabId, ToastMessage, UserData, MfaVerificationPayload } from './types';
import type { Translations } from '../../locales';
import { useThemeMode, useLangMode } from '../handlers/preferences';
import { ToastContainer } from './shared/Toast';
import { TruncatedToken } from './shared/CodeBlock';
import { ProfileTab } from './tabs/profile';
import { PreferencesTab } from './tabs/preferences';
import { SecurityTab } from './tabs/security';
import { IdentitiesTab } from './tabs/identities';
import { OrganizationsTab } from './tabs/organizations';
import { DevTab } from './tabs/dev';
import { UserBadge } from '../userbutton';

// Import MfaVerification type
import type { MfaVerification } from '../../logic/types';
import { Terminal } from 'lucide-react';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

// ─────────────────────────────────────────────────────────────────────────────
// Tab metadata
// ─────────────────────────────────────────────────────────────────────────────

function getTabLabel(id: TabId, t: Translations): string {
  switch (id) {
    case 'profile': return t.tabs.profile;
    case 'preferences': return t.tabs.preferences;
    case 'security': return t.tabs.security;
    case 'identities': return t.tabs.identities;
    case 'organizations': return t.tabs.organizations;
    case 'dev': return t.tabs.dev;
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
    case 'dev': return Terminal;
    default: return UserIcon;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  initialData: DashboardData;
  currentOrgId?: string;
  translations: Translations;
  allTranslations: Record<string, Translations>;
  supportedLangs: string[];
  loadedTabs: TabId[];

  onUpdateBasicInfo: (updates: { name?: string; username?: string }) => Promise<void>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<void>;
  onUpdateProfile: (profile: { givenName?: string; familyName?: string }) => Promise<void>;
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
  onDeleteAccount: (identityVerificationRecordId: string, accessToken: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardClient({
  initialData,
  currentOrgId,
  translations: serverTranslations,
  allTranslations,
  supportedLangs,
  loadedTabs,
  onUpdateBasicInfo,
  onUpdateAvatarUrl,
  onUpdateProfile,
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
  const { themeSpec } = useThemeMode();
  const themeColors = themeSpec.colors;

  // ── Language ───────────────────────────────────────────────────────────────
  const { lang } = useLangMode();
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
  }, [initialData.userData, initialData.accessToken]);

  // ── Organization Data ─────────────────────────────────────────────────────
  // Organization roles and organizations now come from claims in dashboard data



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

  const refreshData = useCallback(() => {
    router.refresh();
  }, [router]);

  // ── Theme handlers (providers handle persistence) ───────────────────────────

  // ── Sign out ───────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    await onSignOut();
  }, [onSignOut]);

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
        padding: '2rem',
        backgroundColor: 'transparent',
        color: themeColors.textPrimary,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-ibm-plex-mono)',
      }}
    >
        {/* Centered Modal */}
        <div
          style={{
            width: '100%',
            maxWidth: '61.875rem',
            height: '41.25rem',
            display: 'flex',
            background: themeColors.bgSecondary,
            border: `1px solid ${themeColors.borderColor}`,
            boxShadow: '0 2rem 5.625rem rgba(0,0,0,0.65)',
            overflow: 'hidden',
            borderRadius: themeSpec.tokens.dashboardRadius,
          }}
        >
        {/* Sidebar */}
        <div
          style={{
            width: '14rem',
            height: '100%',
            background: themeColors.bgPage,
            borderRight: `1px solid ${themeColors.borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          {/* User Block */}
          <div style={{ padding: '1rem 0.875rem 0.9375rem', borderBottom: `1px solid ${themeColors.borderColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <UserBadge Size="2rem" Canvas="Avatar" shape="sq" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    color: themeColors.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userData.profile?.givenName ?? t.dashboard.defaultUserName}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontSize: '0.625rem',
                    color: themeColors.textTertiary,
                    marginTop: '0.0625rem',
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
          <nav style={{ flex: 1, padding: '0.625rem 0.5rem 0.375rem', overflowY: 'auto' }}>
            <p
              style={{
                fontFamily: 'var(--font-ibm-plex-mono)',
                fontWeight: 600,
                fontSize: '0.625rem',
                color: themeColors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                padding: '0.25rem 0.625rem 0.5rem',
              }}
            >
              {t.dashboard.account}
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
                    gap: '0.5625rem',
                    width: '100%',
                    padding: '0.4375rem 0.625rem',
                    background: isActive ? themeColors.bgSecondary : 'transparent',
                    border: 'none',
                    borderLeft: `0.125rem solid ${isActive ? themeColors.accentBlue : 'transparent'}`,
                    color: isActive ? themeColors.textPrimary : themeColors.textTertiary,
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontWeight: 500,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: '0.125rem',
                  }}
                >
                  <Icon size={13} color={isActive ? themeColors.accentBlue : themeColors.textTertiary} />
                  {getTabLabel(tabId, t)}
                </button>
              );
            })}
          </nav>

          {/* Sign Out */}
          <div style={{ padding: '0.375rem 0.5rem 0.75rem', borderTop: `1px solid ${themeColors.borderColor}` }}>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5625rem',
                width: '100%',
                padding: '0.4375rem 0.625rem',
                background: 'transparent',
                border: 'none',
                borderLeft: '0.125rem solid transparent',
                color: themeColors.textTertiary,
                fontFamily: 'var(--font-ibm-plex-mono)',
                fontWeight: 500,
                fontSize: '0.8125rem',
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
            padding: '1.75rem 2rem',
            overflowY: 'auto',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          {activeTab === 'profile' && (
            <ProfileTab
              userData={userData}
              theme={themeSpec}
              t={t}
              onUpdateBasicInfo={onUpdateBasicInfo}
              onUpdateAvatarUrl={onUpdateAvatarUrl}
              onUpdateProfile={onUpdateProfile}
              onSuccess={(msg) => showToast('success', msg)}
              onError={(msg) => showToast('error', msg)}
              refreshData={refreshData}
            />
          )}

          {activeTab === 'preferences' && (
            <PreferencesTab
              theme={themeSpec}
              t={t}
              supportedLangs={supportedLangs}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              userData={userData}
              theme={themeSpec}
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
            <IdentitiesTab userData={userData} theme={themeSpec} t={t} />
          )}

          {activeTab === 'organizations' && (
            <OrganizationsTab userData={userData} currentOrgId={currentOrgId} theme={themeSpec} t={t} />
          )}

          {activeTab === 'dev' && (
            <DevTab userData={userData} theme={themeSpec} t={t} accessToken={accessToken} />
          )}

        </div>
      </div>

      {/* Toasts */}
      <ToastContainer messages={toasts} onDismiss={dismissToast} theme={themeSpec} />
    </div>
  );
}

