import { fetchDashboardData } from '../../logic/actions';
import { DashboardClient } from './client';
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
  getBackupCodes,
  signOutUser,
} from '../../logic/actions';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTranslations, getMainLocale, getAllTranslations } from '../../locales';
import { getDefaultThemeMode } from '../../themes';
import { getSupportedLangs } from '../../logic/i18n';
import { getLoadedTabs } from '../../logic/tabs';

// Server action for refresh
async function handleRefresh() {
  'use server';
  revalidatePath('/');
  return { success: true, redirect: '/' };
}

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
          padding: '20px',
        }}
      >
        <div
          style={{
            background: '#121212',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '16px', marginBottom: '12px' }}>
            {translations.dashboard.error}
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af' }}>
            {'error' in result ? result.error : translations.dashboard.loadFailed}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardClient
      initialData={{
        userData: result.userData,
        accessToken: result.accessToken,
      }}
      translations={translations}
      allTranslations={allTranslations}
      supportedLangs={supportedLangs}
      initialLang={locale}
      loadedTabs={loadedTabs}
      initialTheme={defaultThemeMode}
      onUpdateBasicInfo={updateUserBasicInfo}
      onUpdateAvatarUrl={updateAvatarUrl}
      onUpdateProfile={updateUserProfile}
      onUpdateCustomData={updateUserCustomData}
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
      onGetBackupCodes={getBackupCodes}
      onSignOut={signOutUser}
      onRefresh={handleRefresh}
    />
  );
}
