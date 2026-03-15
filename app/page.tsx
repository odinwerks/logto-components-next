export const dynamic = 'force-dynamic';

import { Dashboard } from './logto-kit';
import { getDefaultThemeMode, darkTheme, lightTheme } from './logto-kit/themes';

export default function HomePage() {
  const themeMode = getDefaultThemeMode();
  const theme = themeMode === 'light' ? lightTheme : darkTheme;
  
  return (
    <main style={{ minHeight: '100vh', background: theme.colors.bgPage }}>
      <Dashboard />
    </main>
  );
}