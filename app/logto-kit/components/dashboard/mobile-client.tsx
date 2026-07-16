'use client';

import { useState, useCallback, useMemo, useSyncExternalStore, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { TabId } from './types';
import type { Translations } from '../../locales';
import { FONT_MONO, type ThemeColors } from '../../themes';
import { useThemeMode, useLangMode } from '../providers/preferences';
import { useUserDataContext } from '../providers/user-data-context';
import { useLogto } from '../providers/logto-provider';
import { ToastContainer } from './shared/Toast';
import { SignOutModal } from './shared/SignOutModal';
import { TabErrorBoundary } from './shared/TabErrorBoundary';
import { useDashboardToasts } from './shared/use-dashboard-toasts';
import { CrossFade, MotionButton, AnimatePresence } from '../shared/motion';
import { ProfileTab } from './tabs/profile';
import { PreferencesTab } from './tabs/preferences';
import { SecurityTab } from './tabs/security';
import { SessionsTab } from './tabs/sessions';
import { IdentitiesTab } from './tabs/identities';
import { OrganizationsTab } from './tabs/organizations';
import type { UserData, MfaVerificationPayload, MfaVerification, LogtoSession } from '../../logic/types';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import { ArrowLeft, Monitor } from 'lucide-react';
import { getTabLabel, UserIcon, ShieldIcon, LinkIcon, BuildingIcon, SettingsIcon, LogoutIcon } from './tab-utils';

// ── Props ────────────────────────────────────────────────────────────────────

interface MobileClientProps {
  initialData: { userData: UserData };
  countryFilter?: { mode: 'allow' | 'block' | 'none'; codes: string[] };
  currentOrgId?: string;
  nameType?: string;
  translations: Translations;
  allTranslations: Record<string, Translations>;
  supportedLangs: string[];
  loadedTabs: TabId[];

  onUpdateBasicInfo: (updates: { name?: string; username?: string }) => Promise<ActionResult>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<ActionResult>;
  onUpdateProfile: (profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onSendEmailVerification: (email: string, lang?: string) => Promise<DataResult<{ verificationId: string }>>;
  onSendPhoneVerification: (phone: string, lang?: string) => Promise<DataResult<{ verificationId: string }>>;
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
  onDeleteAccount: (identityVerificationRecordId: string) => Promise<ActionResult>;
  onRequestWebAuthnRegistration: () => Promise<DataResult<{ registrationOptions: unknown; verificationRecordId: string }>>;
  onVerifyAndLinkWebAuthn: (payload: unknown, verificationRecordId: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onRenamePasskey: (verificationId: string, name: string, identityVerificationRecordId: string) => Promise<ActionResult>;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string) => Promise<DataResult<LogtoSession[]>>;
  onRevokeSession: (sessionId: string, identityVerificationRecordId: string, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;
  onRevokeAllOtherSessions: (verificationRecordId: string) => Promise<ActionResult>;
}

// ── Component ────────────────────────────────────────────────────────────────

// Module-level stable references for useSyncExternalStore (BUG-A03 fix).
// Matching the dashboard-router.tsx pattern: module-level functions avoid
// re-subscription on every render.
const subNarrow = (cb: () => void) => {
  const mq = window.matchMedia('(max-width: 26rem)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const snapNarrow = () => window.matchMedia('(max-width: 26rem)').matches;
const serverNarrow = () => false;

export function MobileClient({
  initialData,
  countryFilter,
  currentOrgId,
  nameType,
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

  // Last-tab tracking for Sessions verification dismissal (D13).
  const lastNonSessionsTabRef = useRef<TabId | null>(null);
  useEffect(() => {
    if (activeTab !== 'sessions' && activeTab !== null) {
      lastNonSessionsTabRef.current = activeTab;
    }
  }, [activeTab]);
  const isNarrowViewport = useSyncExternalStore(subNarrow, snapNarrow, serverNarrow);

  // Defer narrow-viewport layout decisions until after hydration so the first
  // client render matches the server snapshot (false) and avoids a flash.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once guard is the canonical Next.js SSR/hydration pattern
    setMounted(true);
  }, []);
  const isCompact = mounted ? isNarrowViewport : false;

  const { toasts, showToast, dismissToast, mapErrorToast, setSuppressAll } = useDashboardToasts(t);

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

  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(() => {
    setSuppressAll(true);
    setIsSigningOut(true);
  }, [setSuppressAll]);

  const abortSignOut = useCallback(() => {
    setSuppressAll(false);
    setIsSigningOut(false);
  }, [setSuppressAll]);

  // ── Render ──────────────────────────────────────────────────────────────
  // Both views are always mounted so that the CrossFade in the tab view
  // retains its state across menu ↔ tab round-trips. Only the active view is
  // visible; the inactive view hides via `display: none`.

  // Security tab pins its danger zone to the bottom (M6/D11). Other tabs keep
  // their existing vertically-centered, min-height-grows-with-content layout.
  const fillHeight = activeTab === 'security';

  return (
    <>
      {/* ── Menu view ────────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          minHeight: '100dvh',
          display: view === 'menu' ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bgPage,
          color: colors.textPrimary,
          fontFamily: FONT_MONO,
          position: 'relative',
          overflowY: 'auto',
          padding: '2rem 1rem calc(env(safe-area-inset-bottom, 0px) + 12rem)',
          boxSizing: 'border-box',
        }}
      >
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
          data-testid="mobile-main-stack"
          style={{
            width: '100%',
            maxWidth: isCompact ? '18.5rem' : '20rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}
        >
          {loadedTabs.map((tabId) => (
            <MobileMenuEntry
              key={tabId}
              tabId={tabId}
              label={getTabLabel(tabId, t)}
              colors={colors}
              onClick={() => openTab(tabId)}
            />
          ))}
        </div>

        <div
          data-testid="mobile-signout-dock"
          style={{
            position: 'absolute',
            left: 'max(1rem, env(safe-area-inset-left, 0px))',
            right: 'max(1rem, env(safe-area-inset-right, 0px))',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)',
            margin: '0 auto',
            width: '100%',
            maxWidth: isCompact ? '18.5rem' : '20rem',
            zIndex: 10,
          }}
        >
          <MobileMenuEntry
            key="mobile-signout"
            isSignOut
            label={t.common.signOut}
            colors={colors}
            onClick={handleSignOut}
          />
        </div>

        {/* Close dashboard button */}
        <button
          onClick={closeDashboard}
          aria-label="Close dashboard"
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.625rem',
            border: `1px solid ${colors.borderColor}`,
            background: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            backdropFilter: 'blur(0.5rem)',
            WebkitBackdropFilter: 'blur(0.5rem)',
            color: colors.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.bgSecondary;
            e.currentTarget.style.color = colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
            e.currentTarget.style.color = colors.textSecondary;
          }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* ── Tab view ─────────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          minHeight: '100dvh',
          display: view === 'tab' ? undefined : 'none',
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
            padding: isCompact ? '1rem 0.875rem 4rem' : '1.5rem 1.25rem 4rem',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              // When filling, use a DEFINITE height so the inner sticky-footer
              // can scroll; otherwise keep the current min-height + centering.
              justifyContent: fillHeight ? 'flex-start' : 'center',
              ...(fillHeight
                ? { height: 'calc(100dvh - 5.5rem)' }
                : { minHeight: 'calc(100dvh - 5.5rem)' }),
            }}
          >
            {activeTab !== null ? (
              <CrossFade
                activeKey={activeTab}
              className="dashboard-tabpanel-content"
              duration={0.05}
              instant
              fillHeight={fillHeight}
              wrapItem={(tabId, isVisible, content) => (
                <TabErrorBoundary
                  resetKey={`${tabId}-${isVisible ? 'visible' : 'hidden'}`}
                  fallback={(
                    <div
                      role="alert"
                      style={{
                        fontFamily: FONT_MONO,
                        color: colors.accentRed,
                        fontSize: '0.8125rem',
                      }}
                    >
                      {t.dashboard.error}
                    </div>
                  )}
                >
                  {content}
                </TabErrorBoundary>
              )}
            >
              {(tabId) => (
                <>
                  {tabId === 'profile' && (
                    <ProfileTab
                      userData={userData}
                      mode={mode}
                      colors={colors}
                      t={t}
                      mobmode={1}
                      countryFilter={countryFilter}
                      nameType={nameType}
                      onUpdateBasicInfo={onUpdateBasicInfo}
                      onUpdateAvatarUrl={onUpdateAvatarUrl}
                      onUpdateProfile={onUpdateProfile}
                      onVerifyPassword={onVerifyPassword}
                      onSendEmailVerification={(value) => onSendEmailVerification(value, lang)}
                      onSendPhoneVerification={(value) => onSendPhoneVerification(value, lang)}
                      onVerifyCode={onVerifyCode}
                      onUpdateEmail={onUpdateEmail}
                      onUpdatePhone={onUpdatePhone}
                      onRemoveEmail={onRemoveEmail}
                      onRemovePhone={onRemovePhone}
                      onSuccess={(msg) => showToast('success', msg)}
                      onError={(msg) => showToast('error', mapErrorToast(msg))}
                      refreshData={refreshData}
                    />
                  )}

                  {tabId === 'preferences' && (
                    <PreferencesTab
                      mode={mode}
                      colors={colors}
                      t={t}
                      supportedLangs={supportedLangs}
                      mobmode={1}
                    />
                  )}

                  {tabId === 'security' && (
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
                      onError={(msg) => showToast('error', mapErrorToast(msg))}
                    />
                  )}

                  {tabId === 'sessions' && (
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
                      onError={(msg) => showToast('error', mapErrorToast(msg))}
                      isActive={view === 'tab' && activeTab === 'sessions'}
                      onVerificationDismissed={() => {
                        const fallbackTab = lastNonSessionsTabRef.current
                          ?? loadedTabs.find((id) => id !== 'sessions')
                          ?? loadedTabs[0]
                          ?? 'profile';
                        if (fallbackTab === activeTab) {
                          // Sessions is the only tab — go back to menu
                          backToMenu();
                        } else {
                          setActiveTab(fallbackTab);
                        }
                      }}
                    />
                  )}

                  {tabId === 'identities' && (
                    <IdentitiesTab userData={userData} mode={mode} colors={colors} t={t} mobmode={1} />
                  )}

                  {tabId === 'organizations' && (
                    <OrganizationsTab userData={userData} currentOrgId={currentOrgId} mode={mode} colors={colors} t={t} mobmode={1} />
                  )}
                </>
              )}
            </CrossFade>
            ) : null}

          </div>
        </div>

        {/* Floating back button */}
        <button
          onClick={backToMenu}
          aria-label="Back to menu"
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.625rem',
            border: `1px solid ${colors.borderColor}`,
            background: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            backdropFilter: 'blur(0.5rem)',
            WebkitBackdropFilter: 'blur(0.5rem)',
            color: colors.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.bgSecondary;
            e.currentTarget.style.color = colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
            e.currentTarget.style.color = colors.textSecondary;
          }}
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* ── Shared overlays ──────────────────────────────────────────────── */}
      <AnimatePresence>
      <SignOutModal key="signout-modal" isOpen={isSigningOut} onAbort={abortSignOut} mode={mode} colors={colors} t={t} showToast={showToast} />
      </AnimatePresence>
      <ToastContainer messages={toasts} onDismiss={dismissToast} mode={mode} colors={colors} />
    </>
  );
}

// ── MobileMenuEntry ──────────────────────────────────────────────────────────

function MobileMenuEntry({
  label,
  tabId,
  isSignOut,
  colors,
  onClick,
}: {
  label: string;
  tabId?: TabId;
  isSignOut?: boolean;
  colors: ThemeColors;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Card styling + hover previously delivered by the `.ldd-mobile-menu-card`
  // CSS classes (now removed). The whileTap press comes from MotionButton.
  const borderColor = hovered
    ? (isSignOut ? colors.accentRed : colors.textTertiary)
    : colors.borderColor;
  const background = hovered ? colors.bgPage : 'transparent';
  const color = isSignOut
    ? (hovered ? colors.accentRed : colors.textPrimary)
    : colors.textPrimary;

  return (
    <MotionButton
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: '1.25rem 1.5rem',
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: '0.5rem',
        color,
        fontFamily: FONT_MONO,
        fontSize: '0.9375rem',
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
      }}
    >
      {isSignOut ? (
        <LogoutIcon size={18} color="currentColor" aria-hidden="true" />
      ) : tabId ? (
        <TabIcon id={tabId} size={18} color="currentColor" aria-hidden="true" />
      ) : null}
      {label}
    </MotionButton>
  );
}

function TabIcon({ id, size, color }: { id: TabId; size?: number; color?: string }) {
  switch (id) {
    case 'profile': return <UserIcon size={size} color={color} aria-hidden="true" />;
    case 'security': return <ShieldIcon size={size} color={color} aria-hidden="true" />;
    case 'sessions': return <Monitor size={size} color={color} aria-hidden="true" />;
    case 'identities': return <LinkIcon size={size} color={color} aria-hidden="true" />;
    case 'organizations': return <BuildingIcon size={size} color={color} aria-hidden="true" />;
    case 'preferences': return <SettingsIcon size={size} color={color} aria-hidden="true" />;
    default: return <UserIcon size={size} color={color} aria-hidden="true" />;
  }
}
