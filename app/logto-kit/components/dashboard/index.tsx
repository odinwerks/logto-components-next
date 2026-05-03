import { fetchDashboardData } from '../../logic/actions';
import { DashboardClient } from './client';
import { PreferencesProvider } from '../handlers/preferences';
import { UserDataProvider } from '../handlers/user-data-context';
import {
  updateUserBasicInfo,
  updateUserProfile,
  updateUserCustomData,
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
  signOutUser,
  requestWebAuthnRegistration,
  verifyAndLinkWebAuthn,
  renamePasskey,
} from '../../logic/actions';
import { redirect } from 'next/navigation';
import { getTranslations, getMainLocale, getAllTranslations } from '../../locales';
import { getThemeSpec, getDefaultThemeMode } from '../../themes';
import { getSupportedLangs } from '../../logic/i18n';
import { getLoadedTabs } from '../../logic/tabs';
import { getPreferencesFromUserData } from '../../logic/preferences';

export async function Dashboard() {
  // ── Locale & translations ──────────────────────────────────────────────────
  const locale = getMainLocale();
  const translations = getTranslations(locale);
  const allTranslations = getAllTranslations();

  // ── Supported langs (ordered from ENV) ────────────────────────────────────
  const supportedLangs = getSupportedLangs();

  // ── Tabs (ordered from ENV) ────────────────────────────────────────────────
  const loadedTabs = getLoadedTabs();

  // ── Theme default from ENV ─────────────────────────────────────────────────
  const defaultThemeMode = getDefaultThemeMode();
  const darkThemeSpec = getThemeSpec('dark');
  const lightThemeSpec = getThemeSpec('light');
  const errorTheme = darkThemeSpec;

  // ── Fetch user data ────────────────────────────────────────────────────────
  const result = await fetchDashboardData();

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/callback');
    }
    return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: errorTheme.colors.bgPage,
            color: errorTheme.colors.textPrimary,
            fontFamily: 'monospace',
            padding: '1.25rem',
          }}
        >
          <div
            style={{
              background: errorTheme.colors.bgSecondary,
              border: `1px solid ${errorTheme.colors.borderColor}`,
              borderRadius: '0.5rem',
              padding: '1.875rem',
              maxWidth: '31.25rem',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              {translations.dashboard.error}
            </h1>
            <p style={{ fontSize: '0.75rem', color: errorTheme.colors.textTertiary }}>
              {'error' in result ? result.error : translations.dashboard.loadFailed}
            </p>
          </div>
        </div>
    );
  }

  // ── Resolve theme from user preferences or default ─────────────────────────
  // Provider checks sessionStorage first, falls back to this value
  const userPrefs = getPreferencesFromUserData(result.userData);
  const resolvedTheme = userPrefs?.theme ?? defaultThemeMode;
  const resolvedLang = userPrefs?.lang ?? locale;
  const resolvedOrg = userPrefs?.asOrg ?? null;

  return (
    <UserDataProvider userData={result.userData}>
      <PreferencesProvider initialTheme={resolvedTheme} initialLang={resolvedLang} initialOrgId={resolvedOrg} onUpdateCustomData={updateUserCustomData} darkThemeSpec={darkThemeSpec} lightThemeSpec={lightThemeSpec}>
        <DashboardClient
          initialData={{
            userData: result.userData,
          }}
          currentOrgId={resolvedOrg ?? undefined}
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
          onSignOut={signOutUser}
        />
      </PreferencesProvider>
    </UserDataProvider>
  );
}

