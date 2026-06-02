'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { TabId, ToastMessage } from './types';
import type { Translations } from '../../locales';
import type { ThemeColors } from '../../themes';
import { useThemeMode, useLangMode } from '../providers/preferences';
import { useUserDataContext } from '../providers/user-data-context';
import { useLogto } from '../providers/logto-provider';
import { ToastContainer } from './shared/Toast';
import { ProfileTab } from './tabs/profile';
import { PreferencesTab } from './tabs/preferences';
import { SecurityTab } from './tabs/security';
import { SessionsTab } from './tabs/sessions';
import { IdentitiesTab } from './tabs/identities';
import { OrganizationsTab } from './tabs/organizations';
import { DevTab } from './tabs/dev';
import type { UserData, MfaVerificationPayload, MfaVerification, LogtoSession } from '../../logic/types';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import { ArrowLeft } from 'lucide-react';
import { getTabLabel } from './tab-utils';

// ── Props ────────────────────────────────────────────────────────────────────

interface MobileClientProps {
  initialData: { userData: UserData };
  currentOrgId?: string;
  userShape?: 'circle' | 'sq' | 'rsq';
  translations: Translations;
  allTranslations: Record<string, Translations>;
  supportedLangs: string[];
  loadedTabs: TabId[];

  onUpdateBasicInfo: (updates: { name?: string; username?: string }) => Promise<ActionResult>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<ActionResult>;
  onUpdateProfile: (profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onSendEmailVerification: (email: string) => Promise<DataResult<{ verificationId: string }>>;
  onSendPhoneVerification: (phone: string) => Promise<DataResult<{ verificationId: string }>>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<DataResult<{ verificationRecordId: string }>>;
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onRemoveEmail: (identityVerificationRecordId: string) => Promise<ActionResult>;
  onRemovePhone: (identityVerificationRecordId: string) => Promise<ActionResult>;
  onGetMfaVerifications: () => Promise<DataResult<MfaVerification[]>>;
  onGenerateTotpSecret: () => Promise<DataResult<{ secret: string }>>;
  onAddMfaVerification: (verification: MfaVerificationPayload, identityVerificationRecordId: string) => Promise<ActionResult>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onReplaceTotpVerification: (secret: string, code: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onGenerateBackupCodes: (identityVerificationRecordId: string) => Promise<DataResult<{ codes: string[] }>>;
  onUpdatePassword: (newPassword: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onDeleteAccount: (identityVerificationRecordId: string, verificationRecordTimestamp?: number) => Promise<ActionResult>;
  onRequestWebAuthnRegistration: () => Promise<DataResult<{ registrationOptions: unknown; verificationRecordId: string }>>;
  onVerifyAndLinkWebAuthn: (payload: unknown, verificationRecordId: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onRenamePasskey: (verificationId: string, name: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string) => Promise<DataResult<LogtoSession[]>>;
  onRevokeSession: (sessionId: string, identityVerificationRecordId: string, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;
  onRevokeAllOtherSessions: (verificationRecordId: string) => Promise<ActionResult>;
  onSignOut: () => Promise<void>;
}

// ── Component ────────────────────────────────────────────────────────────────

export function MobileClient({
  initialData,
  currentOrgId,
  userShape = 'circle',
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
  onReplaceTotpVerification,
  onGenerateBackupCodes,
  onUpdatePassword,
  onDeleteAccount,
  onRequestWebAuthnRegistration,
  onVerifyAndLinkWebAuthn,
  onRenamePasskey,
  onGetSessionsWithDeviceMeta,
  onRevokeSession,
  onRevokeAllOtherSessions,
  onSignOut,
}: MobileClientProps) {

  const { mode, colors } = useThemeMode();
  const { lang } = useLangMode();
  const t = useMemo<Translations>(
    () => allTranslations[lang] ?? serverTranslations,
    [lang, allTranslations, serverTranslations]
  );

  const { closeDashboard } = useLogto();

  const userDataFromContext = useUserDataContext();
  const userData = userDataFromContext ?? initialData.userData;

  const [view, setView] = useState<'menu' | 'tab'>('menu');
  const [activeTab, setActiveTab] = useState<TabId | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const toast: ToastMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      duration: type === 'success' ? 3000 : 8000,
    };
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const router = useRouter();
  const refreshData = useCallback(() => {
    router.refresh();
  }, [router]);

  const openTab = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setView('tab');
  }, []);

  const backToMenu = useCallback(() => {
    setView('menu');
  }, []);

  // ── Menu view ────────────────────────────────────────────────────────────

  if (view === 'menu') {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bgPage,
          color: colors.textPrimary,
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
          padding: '2rem 1rem',
          boxSizing: 'border-box',
        }}
      >
        <style>{`
          @keyframes mStagger {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Ambient glow at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '30%',
            background: `radial-gradient(ellipse at top, ${
              mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
            } 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Entry box */}
        <div
          style={{
            width: '100%',
            maxWidth: '20rem',
            border: `1px solid ${colors.borderColor}`,
            borderRadius: '0.5rem',
            overflow: 'hidden',
            background: colors.bgSecondary,
          }}
        >
          {loadedTabs.map((tabId, index) => (
            <MobileMenuEntry
              key={tabId}
              tabId={tabId}
              label={getTabLabel(tabId, t)}
              index={index}
              total={loadedTabs.length}
              colors={colors}
              mode={mode}
              onClick={() => openTab(tabId)}
            />
          ))}
        </div>

        {/* Close dashboard button */}
        <button
          onClick={closeDashboard}
          aria-label="Close dashboard"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.35rem',
            width: '3rem',
            height: '3rem',
            borderRadius: '0.75rem',
            border: `1px solid ${colors.borderColor}`,
            background: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            backdropFilter: 'blur(0.5rem)',
            WebkitBackdropFilter: 'blur(0.5rem)',
            color: colors.textTertiary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.bgSecondary;
            e.currentTarget.style.color = colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
            e.currentTarget.style.color = colors.textTertiary;
          }}
        >
          <ArrowLeft size={22} />
        </button>

        <ToastContainer messages={toasts} onDismiss={dismissToast} mode={mode} colors={colors} />
      </div>
    );
  }

  // ── Tab view ─────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100dvh',
        background: colors.bgPage,
        color: colors.textPrimary,
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          minHeight: '100dvh',
          padding: '1.5rem 1.25rem 4rem',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: 'calc(100dvh - 5.5rem)',
          }}
        >
          {activeTab === 'profile' && (
            <ProfileTab
              userData={userData}
              mode={mode}
              colors={colors}
              t={t}
              mobmode={1}
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

        {activeTab === 'preferences' && (
          <PreferencesTab
            mode={mode}
            colors={colors}
            t={t}
            supportedLangs={supportedLangs}
            mobmode={1}
          />
        )}

        {activeTab === 'security' && (
          <SecurityTab
            userData={userData}
            mode={mode}
            colors={colors}
            t={t}
            mobmode={1}
            onVerifyPassword={onVerifyPassword}
            onGetMfaVerifications={onGetMfaVerifications}
            onGenerateTotpSecret={onGenerateTotpSecret}
            onAddMfaVerification={onAddMfaVerification}
            onDeleteMfaVerification={onDeleteMfaVerification}
            onReplaceTotpVerification={onReplaceTotpVerification}
            onGenerateBackupCodes={onGenerateBackupCodes}
            onUpdatePassword={onUpdatePassword}
            onDeleteAccount={onDeleteAccount}
            onRequestWebAuthnRegistration={onRequestWebAuthnRegistration}
            onVerifyAndLinkWebAuthn={onVerifyAndLinkWebAuthn}
            onRenamePasskey={onRenamePasskey}
            onSuccess={(msg) => showToast('success', msg)}
            onError={(msg) => showToast('error', msg)}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsTab
            userData={userData}
            mode={mode}
            colors={colors}
            t={t}
            mobmode={1}
            onGetSessionsWithDeviceMeta={onGetSessionsWithDeviceMeta}
            onRevokeSession={onRevokeSession}
            onRevokeAllOtherSessions={onRevokeAllOtherSessions}
            onVerifyPassword={onVerifyPassword}
            onSuccess={(msg) => showToast('success', msg)}
            onError={(msg) => showToast('error', msg)}
          />
        )}

        {activeTab === 'identities' && (
          <IdentitiesTab userData={userData} mode={mode} colors={colors} t={t} mobmode={1} />
        )}

        {activeTab === 'organizations' && (
          <OrganizationsTab userData={userData} currentOrgId={currentOrgId} mode={mode} colors={colors} t={t} mobmode={1} />
        )}

        {activeTab === 'dev' && (
          <DevTab userData={userData} mode={mode} colors={colors} t={t} mobmode={1} />
        )}
        </div>
      </div>

      {/* Floating back button */}
      <button
        onClick={backToMenu}
        aria-label="Back to menu"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.35rem',
          width: '3rem',
          height: '3rem',
          borderRadius: '0.75rem',
          border: `1px solid ${colors.borderColor}`,
          background: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          backdropFilter: 'blur(0.5rem)',
          WebkitBackdropFilter: 'blur(0.5rem)',
          color: colors.textTertiary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          transition: 'background 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.bgSecondary;
          e.currentTarget.style.color = colors.textPrimary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
          e.currentTarget.style.color = colors.textTertiary;
        }}
      >
        <ArrowLeft size={22} />
      </button>

      <ToastContainer messages={toasts} onDismiss={dismissToast} mode={mode} colors={colors} />
    </div>
  );
}

// ── MobileMenuEntry ──────────────────────────────────────────────────────────

function MobileMenuEntry({
  tabId,
  label,
  index,
  total,
  colors,
  mode,
  onClick,
}: {
  tabId: TabId;
  label: string;
  index: number;
  total: number;
  colors: ThemeColors;
  mode: 'dark' | 'light';
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const isLast = index === total - 1;

  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.bgPage;
        e.currentTarget.style.textShadow = mode === 'dark'
          ? '0 0 0.75rem rgba(255,255,255,0.12)'
          : '0 0 0.75rem rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.textShadow = 'none';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setTimeout(() => setPressed(false), 150)}
      style={{
        width: '100%',
        padding: '1.25rem 1.5rem',
        background: pressed ? colors.bgPage : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : `1px solid ${colors.borderColor}`,
        color: pressed ? colors.accentBlue : colors.textPrimary,
        fontFamily: 'monospace',
        fontSize: '0.9375rem',
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: `mStagger 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        animationDelay: `${index * 0.08}s`,
        opacity: 0,
        textShadow: pressed
          ? (mode === 'dark' ? '0 0 1rem rgba(255,255,255,0.15)' : '0 0 1rem rgba(0,0,0,0.1)')
          : 'none',
      }}
    >
      {label}
    </button>
  );
}
