export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { fetchDashboardData } from './logto-kit/logic/actions';
import { Dashboard } from './logto-kit/components/dashboard';
import { LogtoProvider } from './logto-kit/components/handlers/logto-provider';
import { DARK_COLORS, getDefaultThemeMode } from './logto-kit/themes';
import { getPreferencesFromUserData } from './logto-kit/logic/preferences';
import { getMainLocale } from './logto-kit/locales';
import DemoApp from './demo/index';

export default async function HomePage() {
  const result = await fetchDashboardData();

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/api/auth/sign-in');
    }
    return (
      <main style={{ minHeight: '100vh', background: DARK_COLORS.bgPage }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: DARK_COLORS.textSecondary,
          fontFamily: 'monospace',
        }}>
          Failed to load user data
        </div>
      </main>
    );
  }

  // Resolve user preferences so both LogtoProvider and the dashboard
  // agree on initial theme, lang, and org from the same source (Logto customData).
  const defaultThemeMode = getDefaultThemeMode();
  const defaultLocale = getMainLocale();
  const userPrefs = getPreferencesFromUserData(result.userData);
  const resolvedTheme = userPrefs?.theme ?? defaultThemeMode;
  const resolvedLang  = userPrefs?.lang  ?? defaultLocale;
  const resolvedOrg   = userPrefs?.asOrg ?? null;

  return (
    <main style={{ minHeight: '100vh' }}>
      <LogtoProvider
        userData={result.userData}
        dashboard={<Dashboard />}
        initialTheme={resolvedTheme}
        initialLang={resolvedLang}
        initialOrgId={resolvedOrg}
      >
        <DemoApp />
      </LogtoProvider>
    </main>
  );
}
