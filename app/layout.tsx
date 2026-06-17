import type { Metadata } from 'next';
import { IBM_Plex_Mono, Instrument_Serif, DM_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import AuthWatcher from './logto-kit/components/providers/auth-watcher';
import SessionHeartbeat from './logto-kit/components/providers/session-heartbeat';
import { LangSync } from './logto-kit/components/LangSync';
import { LogtoProvider } from './logto-kit/components/providers/logto-provider';
import { Dashboard } from './logto-kit/components/dashboard';
import { MobileDashboard } from './logto-kit/components/dashboard/mobile-page';
import { fetchDashboardData } from './logto-kit/logic/actions';
import { getDefaultThemeMode } from './logto-kit/themes';
import { getPreferencesFromUserData } from './logto-kit/logic/preferences';
import { getMainLocale } from './logto-kit/locales';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-instrument-serif',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Logto Debug Dashboard',
  description: 'Debug dashboard for Logto authentication',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  // Fetch user data in an auth-tolerant way: no redirect on unauthenticated,
  // errors are handled gracefully. This provides userData to LogtoProvider
  // so isAuthenticated and user preferences work for ALL routes.
  const result = await fetchDashboardData({ tolerateAuthErrors: true });
  const userData = result.success ? result.userData : null;
  const defaultThemeMode = getDefaultThemeMode();
  const defaultLocale = getMainLocale();
  const userPrefs = userData ? getPreferencesFromUserData(userData) : null;
  const resolvedTheme = userPrefs?.theme ?? defaultThemeMode;
  const resolvedLang  = userPrefs?.lang  ?? defaultLocale;
  const resolvedOrg   = userPrefs?.asOrg ?? null;

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/*
          Theme flash prevention: reads theme from sessionStorage and applies it
          before React hydrates. Any DOM change here causes a hydration mismatch,
          which is why suppressHydrationWarning is on <html>. This is the ONLY
          expected source of mismatch.
          The nonce is provided by the middleware's per-request CSP (proxy.ts).
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = window.sessionStorage.getItem('theme-mode');
                var valid = stored === 'dark' || stored === 'light' ? stored : null;
                if (valid) {
                  document.documentElement.setAttribute('data-theme', valid);
                } else {
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${ibmPlexMono.variable} ${instrumentSerif.variable} ${dmSans.variable}`}>
        <LogtoProvider
          userData={userData}
          dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
          initialTheme={resolvedTheme}
          initialLang={resolvedLang}
          initialOrgId={resolvedOrg}
        >
          <AuthWatcher />
          <SessionHeartbeat />
          {children}
          <LangSync />
        </LogtoProvider>
      </body>
    </html>
  );
}
