export const dynamic = 'force-dynamic';

import React from 'react';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from '../logto-kit/logic/actions';
import { Dashboard } from '../logto-kit/components/dashboard';
import { MobileDashboard } from '../logto-kit/components/dashboard/mobile-page';
import { LogtoProvider } from '../logto-kit/components/providers/logto-provider';
import { getDefaultThemeMode } from '../logto-kit/themes';
import { getPreferencesFromUserData } from '../logto-kit/logic/preferences';
import { getMainLocale } from '../logto-kit/locales';
import Sidebar from '../demo/Sidebar';
import { NAV_ITEMS } from '../demo/nav-data';

const appStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
};

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const result = await fetchDashboardData();

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/callback');
    }
    return <div>Failed to load user data</div>;
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
      <div style={appStyle}>
        <Sidebar items={NAV_ITEMS} />
        <div style={{ flex: 1, overflowY: 'auto', background: '#0b0b0d' }}>
          {children}
        </div>
      </div>
    </LogtoProvider>
  );
}
