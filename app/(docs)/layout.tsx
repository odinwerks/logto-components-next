export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from '../logto-kit/logic/actions';
import { Dashboard } from '../logto-kit/components/dashboard';
import { MobileDashboard } from '../logto-kit/components/dashboard/mobile-page';
import { LogtoProvider } from '../logto-kit/components/providers/logto-provider';
import { getDefaultThemeMode } from '../logto-kit/themes';
import { getPreferencesFromUserData } from '../logto-kit/logic/preferences';
import { getMainLocale } from '../logto-kit/locales';
import { AuthErrorBanner } from '../logto-kit/components/auth-error-banner';
import DocsLayoutClient from './layout-client';
import { DocsErrorFallback } from './docs-error-fallback';

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const result = await fetchDashboardData();

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/callback');
    }
    const errorMessage = 'error' in result ? String(result.error) : 'Failed to load user data';
    return <DocsErrorFallback message={errorMessage} />;
  }

  const defaultThemeMode = getDefaultThemeMode();
  const defaultLocale = getMainLocale();
  const userPrefs = getPreferencesFromUserData(result.userData);
  const resolvedTheme = userPrefs?.theme ?? defaultThemeMode;
  const resolvedLang  = userPrefs?.lang  ?? defaultLocale;
  const resolvedOrg   = userPrefs?.asOrg ?? null;

  return (
    <LogtoProvider
      userData={result.userData}
      dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
      initialTheme={resolvedTheme}
      initialLang={resolvedLang}
      initialOrgId={resolvedOrg}
    >
      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>
      <DocsLayoutClient>
        {children}
      </DocsLayoutClient>
    </LogtoProvider>
  );
}
