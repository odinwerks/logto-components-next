import { fetchDashboardData } from '../../logic/actions';
import { DashboardClient, UserProfile } from './client';
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
  generateBackupCodes,
  updateUserPassword,
  deleteUserAccount,
  getBackupCodes,
  signOutUser,
} from '../../logic/actions';
import { redirect } from 'next/navigation';
import { getTranslations, getMainLocale, getAllTranslations } from '../../locales';
import { getDefaultThemeMode } from '../../themes';
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
          background: '#050505',
          color: '#e5e7eb',
          fontFamily: 'monospace',
          padding: '1.25rem',
        }}
      >
        <div
          style={{
            background: '#121212',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
            padding: '1.875rem',
            maxWidth: '31.25rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            {translations.dashboard.error}
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
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

  return (
    <UserDataProvider userData={result.userData}>
      <PreferencesProvider initialTheme={resolvedTheme} initialLang={resolvedLang} onUpdateCustomData={updateUserCustomData}>
        <DashboardClient
          initialData={{
            userData: result.userData,
            accessToken: result.accessToken,
          }}
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
          onGenerateBackupCodes={generateBackupCodes}
          onUpdatePassword={updateUserPassword}
          onDeleteAccount={deleteUserAccount}
          onSignOut={signOutUser}
        />
      </PreferencesProvider>
    </UserDataProvider>
  );
}

// Re-export UserProfile for modal usage
export { UserProfile };