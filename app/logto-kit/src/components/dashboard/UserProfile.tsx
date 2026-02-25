'use client';

import { useState, useMemo } from 'react';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import type { UserData } from '../../logic/types';
import type { MfaVerification, MfaVerificationPayload } from '../../logic/types';
import { UserBadge } from '../userbutton';
import { darkColors, lightColors } from '../../themes';
import { ProfileTab } from './scraps/profile';
import { MfaTab } from './scraps/mfa';
import { IdentitiesTab } from './scraps/identities';
import { OrganizationsTab } from './scraps/organizations';

const PersonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5L2 3.5V7c0 2.5 2.2 4.5 5 5 2.8-.5 5-2.5 5-5V3.5L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="miter" />
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5.5 8.5L8.5 5.5M4 6.5L3 7.5a2.121 2.121 0 003 3l1-1M10 7.5l1-1a2.121 2.121 0 00-3-3l-1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
  </svg>
);

const OrgIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="8" width="3" height="4" stroke="currentColor" strokeWidth="1.2" />
    <rect x="5.5" y="5" width="3" height="7" stroke="currentColor" strokeWidth="1.2" />
    <rect x="9.5" y="2" width="3" height="10" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const PrefIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 4h10M2 7h7M2 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
  </svg>
);

const SignOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 2H2v10h3M9.5 4.5L12 7l-2.5 2.5M12 7H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

const TABS = [
  { id: 'personal', label: 'Personal Info', Icon: PersonIcon },
  { id: 'security', label: 'Security', Icon: ShieldIcon },
  { id: 'identities', label: 'Identities', Icon: LinkIcon },
  { id: 'organizations', label: 'Organizations', Icon: OrgIcon },
  { id: 'preferences', label: 'Preferences', Icon: PrefIcon },
];

interface UserProfileProps {
  userData: UserData;
  accessToken: string;
  translations: Translations;
  supportedLangs: string[];
  initialLang: string;
  initialTheme?: 'dark' | 'light';
  onSignOut: () => void;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onLangChange: (lang: string) => void;
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
  refreshData: () => void;
}

function PreferencesPanel({
  theme,
  lang,
  supportedLangs,
  themeColors,
  onThemeChange,
  onLangChange,
}: {
  theme: 'dark' | 'light';
  lang: string;
  supportedLangs: string[];
  themeColors: ThemeColors;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onLangChange: (lang: string) => void;
}) {
  const [density, setDensity] = useState('Default');
  const [notif, setNotif] = useState({ security: true, email: true, product: false });

  return (
    <div>
      <div style={{ marginBottom: 26 }}>
        <h2
          style={{
            fontFamily: 'var(--font-ibm-plex-mono)',
            fontWeight: 600,
            fontSize: 17,
            color: themeColors.textPrimary,
            marginBottom: 4,
          }}
        >
          Preferences
        </h2>
        <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 13, color: themeColors.textTertiary }}>
          Control language, appearance, and notification settings.
        </p>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-ibm-plex-mono)',
          fontWeight: 500,
          fontSize: 11,
          color: themeColors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          marginBottom: 12,
        }}
      >
        Theme
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
        {[
          { id: 'Light', label: 'Light', theme: 'light' as const },
          { id: 'Dark', label: 'Dark', theme: 'dark' as const },
          { id: 'System', label: 'System', theme: 'system' as const },
        ].map((t) => {
          const resolvedTheme = t.theme === 'system' ? theme : t.theme;
          const active = resolvedTheme === theme;
          return (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.theme === 'system' ? theme : t.theme)}
              style={{
                padding: '14px 12px',
                background: active ? '#0f1520' : themeColors.bgPage,
                border: `1px solid ${active ? '#253a5a' : themeColors.borderColor}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 20,
                  background: active ? '#1a2a3a' : themeColors.bgTertiary,
                  border: `1px solid ${active ? '#2a4060' : themeColors.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                }}
              >
                <span style={{ fontSize: 10, color: active ? '#4a80c4' : themeColors.textTertiary }}>
                  {t.id === 'Light' ? '☀' : t.id === 'Dark' ? '◑' : '⌘'}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 12, fontWeight: 500, color: active ? '#8ab0d8' : themeColors.textTertiary }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-ibm-plex-mono)',
          fontWeight: 500,
          fontSize: 11,
          color: themeColors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          marginBottom: 12,
        }}
      >
        Language
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 11px',
              background: themeColors.bgPage,
              border: `1px solid ${themeColors.borderColor}`,
              color: themeColors.textPrimary,
              fontFamily: 'var(--font-ibm-plex-mono)',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              borderRadius: 4,
            }}
          >
            {supportedLangs.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: themeColors.textTertiary,
              pointerEvents: 'none',
              fontSize: 10,
            }}
          >
            ▾
          </span>
        </div>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-ibm-plex-mono)',
          fontWeight: 500,
          fontSize: 11,
          color: themeColors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          marginBottom: 12,
        }}
      >
        Interface density
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['Compact', 'Default', 'Comfortable'].map((d) => {
          const active = density === d;
          return (
            <button
              key={d}
              onClick={() => setDensity(d)}
              style={{
                flex: 1,
                padding: '8px',
                background: active ? '#0f1520' : themeColors.bgPage,
                border: `1px solid ${active ? '#253a5a' : themeColors.borderColor}`,
                cursor: 'pointer',
                color: active ? '#7aa0c8' : themeColors.textTertiary,
                fontFamily: 'var(--font-ibm-plex-mono)',
                fontSize: 12,
                fontWeight: 500,
                transition: 'all 0.15s',
                borderRadius: 4,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-ibm-plex-mono)',
          fontWeight: 500,
          fontSize: 11,
          color: themeColors.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          marginBottom: 12,
        }}
      >
        Notifications
      </div>
      <div
        style={{
          background: themeColors.bgPage,
          border: `1px solid ${themeColors.borderColor}`,
          padding: '16px 18px',
          borderRadius: 6,
        }}
      >
        {[
          { key: 'security', label: 'Security alerts', desc: 'New sign-ins, password changes, suspicious activity.' },
          { key: 'email', label: 'Email digests', desc: 'Weekly summary of account activity.' },
          { key: 'product', label: 'Product updates', desc: 'New features and product announcements.', noBorder: true },
        ].map((item) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: item.noBorder ? 'none' : `1px solid ${themeColors.borderColor}`,
              gap: 16,
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 500, fontSize: 13, color: themeColors.textPrimary, marginBottom: item.desc ? 2 : 0 }}>
                {item.label}
              </p>
              {item.desc && (
                <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 12, color: themeColors.textTertiary }}>
                  {item.desc}
                </p>
              )}
            </div>
            <button
              role="switch"
              aria-checked={notif[item.key as keyof typeof notif]}
              onClick={() => setNotif((p) => ({ ...p, [item.key]: !p[item.key as keyof typeof notif] }))}
              style={{
                width: 36,
                height: 20,
                background: notif[item.key as keyof typeof notif] ? '#2d5bbf' : themeColors.bgTertiary,
                border: `1px solid ${notif[item.key as keyof typeof notif] ? '#2550aa' : themeColors.borderColor}`,
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
                transition: 'background 0.15s, border-color 0.15s',
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  left: notif[item.key as keyof typeof notif] ? 17 : 3,
                  width: 12,
                  height: 12,
                  background: notif[item.key as keyof typeof notif] ? '#fff' : themeColors.textTertiary,
                  transition: 'left 0.15s, background 0.15s',
                  borderRadius: 2,
                }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserProfile({
  userData,
  accessToken: _accessToken,
  translations: t,
  supportedLangs,
  initialLang,
  initialTheme = 'dark',
  onSignOut,
  onThemeChange,
  onLangChange,
  onUpdateBasicInfo,
  onUpdateAvatarUrl,
  onUpdateProfile,
  onUpdateCustomData: _onUpdateCustomData,
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
  refreshData,
}: UserProfileProps) {
  const [tab, setTab] = useState('personal');
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);

  const themeColors = useMemo<ThemeColors>(() => (theme === 'dark' ? darkColors : lightColors), [theme]);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    onThemeChange(newTheme);
  };

  const handleLangChange = (newLang: string) => {
    onLangChange(newLang);
  };

  const renderPanel = () => {
    switch (tab) {
      case 'personal':
        return (
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
            onSuccess={() => {}}
            onError={() => {}}
            refreshData={refreshData}
          />
        );

      case 'security':
        return (
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
            onSuccess={() => {}}
            onError={() => {}}
          />
        );

      case 'identities':
        return <IdentitiesTab userData={userData} themeColors={themeColors} t={t} />;

      case 'organizations':
        return <OrganizationsTab userData={userData} themeColors={themeColors} t={t} />;

      case 'preferences':
        return (
          <PreferencesPanel
            theme={theme}
            lang={initialLang}
            supportedLangs={supportedLangs}
            themeColors={themeColors}
            onThemeChange={handleThemeChange}
            onLangChange={handleLangChange}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <style>
        {`
          *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
          ::-webkit-scrollbar { width: 4px; background: transparent; }
          ::-webkit-scrollbar-thumb { background: #1e1e22; }
          select option { background: ${themeColors.bgSecondary}; }
        `}
      </style>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: themeColors.bgPage }}>
        <div
          style={{
            width: '100%',
            maxWidth: 860,
            display: 'flex',
            background: themeColors.bgSecondary,
            border: `1px solid ${themeColors.borderColor}`,
            boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
            borderRadius: 8,
          }}
        >
          {/* Sidebar */}
          <div
            style={{
              width: 210,
              background: themeColors.bgTertiary,
              borderRight: `1px solid ${themeColors.borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              borderRadius: '8px 0 0 8px',
            }}
          >
            {/* User block */}
            <div style={{ padding: '16px 14px', borderBottom: `1px solid ${themeColors.borderColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserBadge userData={userData} themeColors={themeColors} Size="32px" Canvas="Avatar" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      fontWeight: 600,
                      fontSize: 13,
                      color: themeColors.textPrimary,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {userData.name || 'User'}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      fontSize: 10,
                      color: themeColors.textTertiary,
                      marginTop: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {userData.primaryEmail || userData.username || 'No email'}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav tabs */}
            <nav style={{ flex: 1, padding: '10px 8px 8px' }}>
              <p
                style={{
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  fontWeight: 500,
                  fontSize: 10,
                  color: themeColors.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                  padding: '4px 8px 8px',
                }}
              >
                Account
              </p>
              {TABS.map(({ id, label, Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      width: '100%',
                      padding: '7px 9px',
                      background: active ? themeColors.bgSecondary : 'transparent',
                      border: 'none',
                      borderLeft: `2px solid ${active ? '#2d5bbf' : 'transparent'}`,
                      color: active ? themeColors.accentBlue : themeColors.textTertiary,
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      fontWeight: 500,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'color 0.1s, background 0.1s, border-color 0.1s',
                      marginBottom: 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = themeColors.textSecondary;
                        e.currentTarget.style.background = themeColors.bgPage;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = themeColors.textTertiary;
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>
                      <Icon />
                    </span>
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Sign out */}
            <div style={{ padding: '8px 8px 10px', borderTop: `1px solid ${themeColors.borderColor}` }}>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  width: '100%',
                  padding: '7px 9px',
                  background: 'transparent',
                  border: 'none',
                  borderLeft: '2px solid transparent',
                  color: themeColors.textTertiary,
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.1s',
                }}
                onClick={onSignOut}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#a03535';
                  e.currentTarget.style.background = '#110c0c';
                  e.currentTarget.style.borderLeftColor = '#4a1a1a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = themeColors.textTertiary;
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderLeftColor = 'transparent';
                }}
              >
                <SignOutIcon />
                Sign out
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              padding: '26px 28px',
              overflowY: 'auto',
              maxHeight: 680,
              borderRadius: '0 8px 8px 0',
            }}
          >
            {renderPanel()}
          </div>
        </div>
      </div>
    </>
  );
}
