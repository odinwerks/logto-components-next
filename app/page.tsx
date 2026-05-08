export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { fetchDashboardData } from './logto-kit/logic/actions';
import { Dashboard } from './logto-kit/components/dashboard';
import { LogtoProvider } from './logto-kit/components/handlers/logto-provider';
import { DARK_COLORS } from './logto-kit/themes';
import DemoApp from './demo/index';

export default async function HomePage() {
  const result = await fetchDashboardData();

  const darkColors = DARK_COLORS;

  if (!result.success) {
    if ('needsAuth' in result && result.needsAuth) {
      redirect('/callback');
    }
    return (
      <main style={{ minHeight: '100vh', background: darkColors.bgPage }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: darkColors.textSecondary,
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
        dashboard={<Dashboard />}
      >
        <DemoApp />
      </LogtoProvider>
    </main>
  );
}
