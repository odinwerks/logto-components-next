import { fetchDashboardData } from '../../logic/actions';
import { MobileClient } from './mobile-client';
import { LogtoProvider } from '../handlers/logto-provider';
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
import { getDefaultThemeMode, DARK_COLORS } from '../../themes';
import { getSupportedLangs } from '../../logic/i18n';
import { getLoadedTabs } from '../../logic/tabs';
import { getPreferencesFromUserData } from '../../logic/preferences';

export async function MobileDashboard() {
  const locale = getMainLocale();
  const translations = getTranslations(locale);
  const allTranslations = getAllTranslations();

  const supportedLangs = getSupportedLangs();
  const loadedTabs = getLoadedTabs();

  const defaultThemeMode = getDefaultThemeMode();
  const errorColors = DARK_COLORS;

  const result = await fetchDashboardData();

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/callback');
    }
    return (
      <div
        style={{
          minHeight: '100dvh',
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
  const resolvedTheme = userPrefs?.theme ?? defaultThemeMode;
  const resolvedLang = userPrefs?.lang ?? locale;
  const resolvedOrg = userPrefs?.asOrg ?? null;

  return (
    <LogtoProvider
      userData={result.userData}
      initialTheme={resolvedTheme}
      initialLang={resolvedLang}
      initialOrgId={resolvedOrg}
    >
      <MobileClient
          initialData={{
            userData: result.userData,
          }}
          currentOrgId={resolvedOrg ?? undefined}
          userShape={(process.env.NEXT_PUBLIC_USER_SHAPE as 'circle' | 'sq' | 'rsq') ?? 'circle'}
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
    </LogtoProvider>
  );
}
