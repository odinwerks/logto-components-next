import { fetchDashboardDataCached } from '../../logic/cached-dashboard';
import { fetchPersonalRbacCached, fetchOrgRbacCached } from '../../logic/cached-rbac';
import { DashboardClient } from './client';
import {
  updateUserBasicInfo,
  updateUserProfile,
  updateAvatarUrl,
  verifyPasswordForIdentity,
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
  verifyVerificationCode,
  updateEmailWithVerification,
  updatePhoneWithVerification,
  removeUserEmail,
  removeUserPhone,
  getMfaVerifications,
  generateTotpSecret,
  addMfaVerification,
  deleteMfaVerification,
  replaceTotpVerification,
  generateBackupCodes,
  updateUserPassword,
  deleteUserAccount,
  getSessionsWithDeviceMeta,
  revokeUserSession,
  revokeAllOtherSessions,
  requestWebAuthnRegistration,
  verifyAndLinkWebAuthn,
  renamePasskey,
} from '../../logic/actions';
import { getTranslations, getMainLocale, getAllTranslations } from '../../locales';
import { DARK_COLORS } from '../../themes';
import { getSupportedLangs } from '../../logic/i18n';
import { getLoadedTabs } from '../../logic/tabs';
import { getPreferencesFromUserData } from '../../logic/preferences';
import { getCountryFilter } from '../../config';

export async function Dashboard() {
  // ── Locale & translations ──────────────────────────────────────────────────
  const locale = getMainLocale();
  const translations = getTranslations(locale);
  const allTranslations = getAllTranslations();

  // ── Supported langs (ordered from ENV) ────────────────────────────────────
  const supportedLangs = getSupportedLangs();

  // ── Tabs (ordered from ENV) ────────────────────────────────────────────────
  const loadedTabs = getLoadedTabs();

  const errorColors = DARK_COLORS;

  // ── Fetch user data ────────────────────────────────────────────────────────
  const result = await fetchDashboardDataCached(true);

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      // Unauthenticated: render nothing. The auth dialog/prompt is handled by
      // the parent layout or trigger component. Do NOT redirect here because
      // all routes are publicly accessible since the proxy whitelist was removed.
      return null;
    }
    return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          background: errorColors.bgPage,
          color: errorColors.textPrimary,
            fontFamily: 'monospace',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
          background: errorColors.bgSecondary,
          border: `1px solid ${errorColors.borderColor}`,
              borderRadius: '0.5rem',
              padding: '1.875rem',
              maxWidth: '31.25rem',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              {translations.dashboard.error}
            </h1>
            <p style={{ fontSize: '0.75rem', color: errorColors.textTertiary }}>
              {'error' in result ? result.error : translations.dashboard.loadFailed}
            </p>
          </div>
        </div>
    );
  }

  const userPrefs = getPreferencesFromUserData(result.userData);
  const resolvedOrg = userPrefs?.asOrg ?? null;

  // ── Kick off RBAC promises (instant fetch) ─────────────────────────────────
  // These are NOT awaited — they start during server render and run in
  // parallel with the RSC payload streaming. The client shells receive them
  // as promise props and consume them via React 19 `use()` inside
  // `<Suspense>` boundaries (Phase 3).
  //
  // `userId` is server-derived from `fetchDashboardDataCore`'s `claims.sub`
  // (IDOR-safe — NEVER-TOUCH). The cores validate it with
  // `assertSafeLogtoId(userId, 'userId')` before any URL interpolation.
  //
  // `fetchPersonalRbacCached` is always kicked off (profile is the default
  // tab). `fetchOrgRbacCached` is conditional on `resolvedOrg` being set.
  //
  // `React.cache` dedupes the desktop + mobile double-RSC render → one
  // personal RBAC fetch + one org RBAC fetch per page.
  const userId = result.userData.id;
  const personalRbacPromise = fetchPersonalRbacCached(userId);
  const orgRbacPromise = resolvedOrg
    ? fetchOrgRbacCached(userId, resolvedOrg)
    : null;

  return (
        <DashboardClient
          initialData={{
            userData: result.userData,
          }}
          personalRbacPromise={personalRbacPromise}
          orgRbacPromise={orgRbacPromise}
          countryFilter={getCountryFilter()}
          currentOrgId={resolvedOrg ?? undefined}
          userShape={(process.env.NEXT_PUBLIC_USER_SHAPE as 'circle' | 'sq' | 'rsq') ?? 'circle'}
          nameType={process.env.NEXT_PUBLIC_NAME_TYPE}
          translations={translations}
          allTranslations={allTranslations}
          supportedLangs={supportedLangs}
          loadedTabs={loadedTabs}
          onUpdateBasicInfo={updateUserBasicInfo}
          onUpdateAvatarUrl={updateAvatarUrl}
          onUpdateProfile={updateUserProfile}
          onVerifyPassword={verifyPasswordForIdentity}
          onSendEmailVerification={sendEmailVerificationCode}
          onSendPhoneVerification={sendPhoneVerificationCode}
          onVerifyCode={verifyVerificationCode}
          onUpdateEmail={updateEmailWithVerification}
          onUpdatePhone={updatePhoneWithVerification}
          onRemoveEmail={removeUserEmail}
          onRemovePhone={removeUserPhone}
          onGetMfaVerifications={getMfaVerifications}
          onGenerateTotpSecret={generateTotpSecret}
          onAddMfaVerification={addMfaVerification}
          onDeleteMfaVerification={deleteMfaVerification}
          onReplaceTotpVerification={replaceTotpVerification}
          onGenerateBackupCodes={generateBackupCodes}
          onUpdatePassword={updateUserPassword}
          onDeleteAccount={deleteUserAccount}
          onRequestWebAuthnRegistration={requestWebAuthnRegistration}
          onVerifyAndLinkWebAuthn={verifyAndLinkWebAuthn}
          onRenamePasskey={renamePasskey}
          onGetSessionsWithDeviceMeta={getSessionsWithDeviceMeta}
          onRevokeSession={revokeUserSession}
          onRevokeAllOtherSessions={revokeAllOtherSessions}
        />
  );
}
