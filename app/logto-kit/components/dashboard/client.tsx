'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IBM_Plex_Mono } from 'next/font/google';
import type { DashboardData, TabId, MfaVerificationPayload, ThemeColors, PersonalRbacResult, OrgRbacResult } from './types';
import type { Translations } from '../../locales';
import { useThemeMode, useLangMode } from '../providers/preferences';
import { useUserDataContext } from '../providers/user-data-context';
import { RbacPromisesProvider } from '../providers/rbac-stream-context';
import { SignOutModal } from './shared/SignOutModal';
import { TabErrorBoundary } from './shared/TabErrorBoundary';
import { ProfileTab } from './tabs/profile';
import { PreferencesTab } from './tabs/preferences';
import { SecurityTab } from './tabs/security';
import { SessionsTab } from './tabs/sessions';
import { IdentitiesTab } from './tabs/identities';
import { OrganizationsTab } from './tabs/organizations';
import { UserBadge } from '../UserButton';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import { useToast } from '../providers/toast-provider';
import { CrossFade, MotionButton, AnimatePresence } from '../shared/motion';

// Import MfaVerification type
import type { MfaVerification, LogtoSession } from '../../logic/types';
import { getTabIcon, getTabLabel, LogoutIcon } from './tab-utils';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

// ─────────────────────────────────────────────────────────────────────────────
// Tab metadata
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  initialData: DashboardData;
  /**
   * Streamed personal RBAC promise (roles + permissions). Kicked off in the
   * `Dashboard` RSC and consumed via `use()` inside `<Suspense>` by the
   * profile tab's stream consumers (Phase 3). `null`-safe: always provided
   * for authenticated users.
   */
  personalRbacPromise?: Promise<PersonalRbacResult>;
  /**
   * Streamed org RBAC promise (roles + permission descriptions). `null`
   * when no org is active. Consumed via `use()` by the organizations tab
   * (Phase 3).
   */
  orgRbacPromise?: Promise<OrgRbacResult> | null;
  countryFilter?: { mode: 'allow' | 'block' | 'none'; codes: string[] };
  currentOrgId?: string;
  userShape?: 'circle' | 'sq' | 'rsq';
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardClient({
  initialData,
  personalRbacPromise,
  orgRbacPromise,
  countryFilter,
  currentOrgId,
  userShape = 'circle',
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
}: DashboardClientProps) {

  // ── Theme ──────────────────────────────────────────────────────────────────
  const { mode, colors } = useThemeMode();

  // ── Language ───────────────────────────────────────────────────────────────
  const { lang } = useLangMode();
  const t = useMemo<Translations>(
    () => allTranslations[lang] ?? serverTranslations,
    [lang, allTranslations, serverTranslations]
  );

  // ── User Data ──────────────────────────────────────────────────────────────
  const userDataFromContext = useUserDataContext();
  const userData = userDataFromContext ?? initialData.userData;

  // ── Organization Data ─────────────────────────────────────────────────────
  // Organization roles and organizations now come from claims in dashboard data

  // ── Tabs
  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>(loadedTabs[0] ?? 'profile');

  // Re-sync activeTab when loadedTabs changes (e.g. RBAC gates a tab away)
  useEffect(() => {
    setActiveTab((cur) => (loadedTabs.includes(cur) ? cur : (loadedTabs[0] ?? 'profile')));
  }, [loadedTabs]);

  // ── Visited-tab tracking (Phase 4: CrossFade keepMountedKeys) ──────────────
  // Tabs the user has opened at least once stay mounted (hidden via
  // `display:none`) across tab switches so their internal state (form drafts,
  // hook subscriptions, scroll positions) survives round-trips — and so
  // `use()` of an already-resolved streamed promise is synchronous on remount
  // (no Suspense flash). Unvisited tabs do NOT mount until first open, so
  // their lazy fetches (MFA, sessions) don't fire on page load.
  //
  // Seeded with the initial active tab (it is "visited" by virtue of being
  // displayed on first paint).
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    () => new Set(loadedTabs[0] ? [loadedTabs[0]] : []),
  );
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- syncing a derived Set from the active tab; the reducer guard makes this a no-op when the tab is already tracked, so it does not cascade. */
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeTab]);

  // Last-tab tracking for Sessions verification dismissal (D13).
  // Stores the most recent non-sessions tab so that when the user dismisses
  // the sessions verification modal, the shell can navigate back to it.
  const lastNonSessionsTabRef = useRef<TabId | null>(null);
  useEffect(() => {
    if (activeTab !== 'sessions') {
      lastNonSessionsTabRef.current = activeTab;
    }
  }, [activeTab]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const { showToast, mapErrorToast, setSuppressAll } = useToast();

  // tabRefs retained for roving-tabindex focus management (keyboard nav).
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const tabPanelId = 'dashboard-tabpanel';

  const focusAndActivateTab = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    tabRefs.current[tabId]?.focus();
  }, []);

  const handleTabKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, currentTabId: TabId) => {
    if (loadedTabs.length === 0) {
      return;
    }

    const currentIndex = loadedTabs.indexOf(currentTabId);
    if (currentIndex < 0) {
      return;
    }

    let targetTab: TabId | null = null;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        targetTab = loadedTabs[(currentIndex + 1) % loadedTabs.length] ?? null;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        targetTab = loadedTabs[(currentIndex - 1 + loadedTabs.length) % loadedTabs.length] ?? null;
        break;
      case 'Home':
        targetTab = loadedTabs[0] ?? null;
        break;
      case 'End':
        targetTab = loadedTabs[loadedTabs.length - 1] ?? null;
        break;
      default:
        break;
    }

    if (!targetTab) {
      return;
    }

    event.preventDefault();
    focusAndActivateTab(targetTab);
  }, [focusAndActivateTab, loadedTabs]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  // router.refresh() re-fetches the RSC payload for the current route,
  // bypassing the Data Cache. This re-runs Dashboard (which calls fetchDashboardData)
  // and all server components, giving the client fresh user data.
  // No server action needed - onRefresh/revalidatePath was redundant here.
  const router = useRouter();

  const refreshData = useCallback(() => {
    router.refresh();
  }, [router]);

  // ── Theme handlers (providers handle persistence) ───────────────────────────

  // ── Sign out ───────────────────────────────────────────────────────────────
  const [isSigningOut, setIsSigningOut] = useState(false);
  const handleSignOut = useCallback(() => {
    setSuppressAll(true);
    setIsSigningOut(true);
  }, [setSuppressAll]);

  const abortSignOut = useCallback(() => {
    setSuppressAll(false);
    setIsSigningOut(false);
  }, [setSuppressAll]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  // Security tab needs its tabpanel to be a flex column so the danger zone can
  // pin to the bottom (D11). Per-key fillHeight (BUG-L04) keeps the layout
  // correct during the crossfade's fade-out frame — the outgoing Security panel
  // stays flex until the fade completes (displayedKey, not activeKey).
  const fillHeightKeys = ['security'];

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
          color: colors.textPrimary,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-ibm-plex-mono)',
      }}
    >
        {/* Centered Modal */}
        <div
          style={{
            width: '100%',
            maxWidth: '61.875rem',
            height: 'min(41.25rem, calc(100vh - 4rem))',
            display: 'flex',
        background: colors.bgSecondary,
        border: `1px solid ${colors.borderColor}`,
            boxShadow: '0 2rem 5.625rem rgba(0,0,0,0.65)',
            overflow: 'hidden',
            borderRadius: '0',
          }}
        >
        {/* Sidebar */}
        <div
          style={{
            width: '14rem',
            height: '100%',
        background: colors.bgPage,
        borderRight: `1px solid ${colors.borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          {/* User Block */}
          <div style={{ padding: '1rem 0.875rem 0.9375rem', borderBottom: `1px solid ${colors.borderColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <UserBadge Size="2rem" Canvas="Avatar" shape={userShape} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
        color: colors.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {[userData.profile?.givenName, userData.profile?.familyName].filter(Boolean).join(' ') || userData.username || userData.primaryEmail || t.dashboard.defaultUserName}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontSize: '0.625rem',
          color: colors.textTertiary,
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
          <div style={{ flex: 1, padding: '0.625rem 0.5rem 0.375rem', overflowY: 'auto' }}>
            <p
              id="account-section-label"
              style={{
                fontFamily: 'var(--font-ibm-plex-mono)',
                fontWeight: 600,
                fontSize: '0.625rem',
                color: colors.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                padding: '0.25rem 0.625rem 0.5rem',
              }}
            >
              {t.dashboard.account}
            </p>
            <nav
              role="tablist"
              aria-labelledby="account-section-label"
            >
              {loadedTabs.map((tabId, index) => {
                const Icon = getTabIcon(tabId);
                const isActive = activeTab === tabId;
                const isLast = index === loadedTabs.length - 1;
                return (
                  <NavButton
                    key={tabId}
                    tabId={tabId}
                    isActive={isActive}
                    label={getTabLabel(tabId, t)}
                    Icon={Icon}
                    colors={colors}
                    themeMode={mode}
                    panelId={tabPanelId}
                    tabIndex={isActive ? 0 : -1}
                    onKeyDown={(event) => handleTabKeyDown(event, tabId)}
                    buttonRef={(node) => {
                      tabRefs.current[tabId] = node;
                    }}
                    onClick={() => setActiveTab(tabId)}
                    borderBottom={!isLast ? `1px dashed ${colors.borderColor}` : undefined}
                  />
                );
              })}
            </nav>
          </div>

          {/* Sign Out */}
          <div style={{ padding: '0.375rem 0.5rem 0.75rem', borderTop: `1px solid ${colors.borderColor}` }}>
        <SignOutButton
          label={t.common.signOut}
          colors={colors}
          themeMode={mode}
          onClick={handleSignOut}
        />
          </div>
        </div>

        {/* Content */}
        <div
          role="tabpanel"
          id={tabPanelId}
          aria-labelledby={`tab-${activeTab}`}
          style={{
            flex: 1,
            padding: '1.75rem 2rem',
            overflowY: 'auto',
            height: '100%',
            boxSizing: 'border-box',
            // Always a flex column so a CrossFade child with fillHeightKeys can
            // resolve `flex: 1 1 auto`. Non-fill tabs render identically.
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <RbacPromisesProvider personalRbacPromise={personalRbacPromise} orgRbacPromise={orgRbacPromise}>
          <CrossFade
            activeKey={activeTab}
            className="dashboard-tabpanel-content"
            duration={0.05}
            fillHeightKeys={fillHeightKeys}
            keepMountedKeys={[...visitedTabs]}
            wrapItem={(tabId, isVisible, content) => (
              <TabErrorBoundary
                resetKey={`${tabId}-${activeTab}`}
                fallback={(
                  <div
                    role="alert"
                    style={{
                      fontFamily: 'var(--font-ibm-plex-mono)',
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
                  />
                )}

                {tabId === 'security' && (
                  <SecurityTab
                    userData={userData}
                    mode={mode}
                    colors={colors}
                    t={t}
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
                    onGetSessionsWithDeviceMeta={onGetSessionsWithDeviceMeta}
                    onRevokeSession={onRevokeSession}
                    onRevokeAllOtherSessions={onRevokeAllOtherSessions}
                    onVerifyPassword={onVerifyPassword}
                    onSuccess={(msg) => showToast('success', msg)}
                    onError={(msg) => showToast('error', mapErrorToast(msg))}
                    isActive={activeTab === 'sessions'}
                    onVerificationDismissed={() => {
                      const fallbackTab = lastNonSessionsTabRef.current
                        ?? loadedTabs.find((id) => id !== 'sessions')
                        ?? loadedTabs[0]
                        ?? 'profile';
                      setActiveTab(fallbackTab);
                    }}
                  />
                )}

                {tabId === 'identities' && (
                  <IdentitiesTab userData={userData} mode={mode} colors={colors} t={t} />
                )}

                {tabId === 'organizations' && (
                  <OrganizationsTab userData={userData} currentOrgId={currentOrgId} mode={mode} colors={colors} t={t} />
                )}
              </>
            )}
          </CrossFade>
          </RbacPromisesProvider>
        </div>
      </div>

      {/* Toasts */}
      <AnimatePresence>
      <SignOutModal key="signout-modal" isOpen={isSigningOut} onAbort={abortSignOut} mode={mode} colors={colors} t={t} />
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavButton - isolated to avoid hooks-in-loops
// ─────────────────────────────────────────────────────────────────────────────

function NavButton({
  tabId, isActive, label, Icon, colors, themeMode, onClick, panelId, tabIndex, onKeyDown, buttonRef, borderBottom,
}: {
  tabId: TabId;
  isActive: boolean;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  colors: ThemeColors;
  themeMode: 'dark' | 'light';
  panelId: string;
  tabIndex: number;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onClick: () => void;
  borderBottom?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const hoverBg = themeMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const seekerBg = themeMode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  // Blue left-border accent to visually anchor the active tab.
  const accentBlueLeft = `0.1875rem solid ${colors.accentBlue}`;

  const activeBg = isActive ? seekerBg : (hovered ? hoverBg : 'transparent');

  return (
    <MotionButton
      ref={buttonRef}
      id={`tab-${tabId}`}
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '0.4375rem 0.625rem 0.4375rem calc(0.625rem - 0.1875rem)',
        background: activeBg,
        border: 'none',
        borderLeft: isActive ? accentBlueLeft : '0.1875rem solid transparent',
        borderBottom: borderBottom ?? 'none',
        borderRadius: '0 0.25rem 0.25rem 0',
        color: isActive ? colors.accentBlue : colors.textTertiary,
        fontFamily: 'var(--font-ibm-plex-mono)',
        fontWeight: 500,
        fontSize: '0.8125rem',
        cursor: 'pointer',
        textAlign: 'left',
        marginBottom: '0.125rem',
        transition: 'background 0.12s ease, color 0.12s ease, border-color 0.12s ease',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5625rem', width: '100%' }}>
        <Icon size={13} color={isActive ? colors.accentBlue : colors.textTertiary} aria-hidden="true" />
        {label}
      </span>
    </MotionButton>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SignOutButton - faint-red destructive style with hover
// ─────────────────────────────────────────────────────────────────────────────

function SignOutButton({
  label, colors: _colors, themeMode, onClick,
}: {
  label: string;
  colors: ThemeColors;
  themeMode: 'dark' | 'light';
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const dimRed = themeMode === 'dark' ? 'rgba(239,68,68,0.85)' : 'rgba(185,28,28,0.85)';
  const fullRed = themeMode === 'dark' ? 'rgba(239,68,68,0.9)' : 'rgb(185,28,28)';
  const hoverBg = themeMode === 'dark' ? 'rgba(239,68,68,0.07)' : 'rgba(185,28,28,0.05)';

  return (
    <MotionButton
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5625rem',
        width: '100%',
        padding: '0.4375rem 0.625rem',
        background: hovered ? hoverBg : 'transparent',
        border: 'none',
        borderLeft: '0.125rem solid transparent',
        color: hovered ? fullRed : dimRed,
        fontFamily: 'var(--font-ibm-plex-mono)',
        fontWeight: 500,
        fontSize: '0.8125rem',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.12s ease, color 0.12s ease',
      }}
    >
      <LogoutIcon size={13} color="currentColor" />
      {label}
    </MotionButton>
  );
}
