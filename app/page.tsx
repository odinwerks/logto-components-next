export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { fetchDashboardData } from './logto-kit/logic/actions';
import { Dashboard } from './logto-kit/components/dashboard';
import { LogtoProvider } from './logto-kit/components/handlers/logto-provider';
import { darkTheme } from './logto-kit/themes';
import DemoApp from './demo';

export default async function HomePage() {
  const result = await fetchDashboardData();

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/callback');
    }
    return (
      <main style={{ minHeight: '100vh', background: '#0f0f12' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: darkTheme.colors.textSecondary,
          fontFamily: 'monospace',
        }}>
          Failed to load user data
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh' }}>
      <LogtoProvider
        userData={result.userData}
        accessToken={result.accessToken}
        dashboard={<Dashboard />}
      >
        <DemoApp />
      </LogtoProvider>
    </main>
  );
}
