export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { fetchDashboardData } from './logto-kit/logic/actions';
import { Dashboard } from './logto-kit/components/dashboard';
import { LogtoProvider } from './logto-kit/components/handlers/logto-provider';
import { getThemeSpec } from './logto-kit/themes';
import DemoApp from './demo/index';

export default async function HomePage() {
  const result = await fetchDashboardData();

  const darkThemeSpec = getThemeSpec('dark');

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/callback');
    }
    return (
      <main style={{ minHeight: '100vh', background: darkThemeSpec.colors.bgPage }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: darkThemeSpec.colors.textSecondary,
          fontFamily: 'monospace',
        }}>
          Failed to load user data
        </div>
      </main>
    );
  }

  const lightThemeSpec = getThemeSpec('light');

  return (
    <main style={{ minHeight: '100vh' }}>
      <LogtoProvider
        userData={result.userData}
        dashboard={<Dashboard />}
        darkThemeSpec={darkThemeSpec}
        lightThemeSpec={lightThemeSpec}
      >
        <DemoApp />
      </LogtoProvider>
    </main>
  );
}
