import type { Metadata } from 'next';
import { IBM_Plex_Mono, Instrument_Serif, DM_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import AuthWatcher from './logto-kit/components/providers/auth-watcher';
import SessionHeartbeat from './logto-kit/components/providers/session-heartbeat';
import { LangSync } from './logto-kit/components/LangSync';
import { LogtoProvider } from './logto-kit/components/providers/logto-provider';
import { MotionConfigProvider } from './logto-kit/components/shared/motion';
import { Dashboard } from './logto-kit/components/dashboard';
import { MobileDashboard } from './logto-kit/components/dashboard/mobile-page';
import { fetchDashboardDataCached } from './logto-kit/logic/cached-dashboard';
import { getDefaultThemeMode } from './logto-kit/themes';
import { getPreferencesFromUserData } from './logto-kit/logic/preferences';
import { getMainLocale, getAllTranslations } from './logto-kit/locales';

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
  const result = await fetchDashboardDataCached(true);
  const userData = result.success ? result.userData : null;
  const defaultThemeMode = getDefaultThemeMode();
  const defaultLocale = getMainLocale();
  const userPrefs = userData ? getPreferencesFromUserData(userData) : null;
  const resolvedTheme = userPrefs?.theme ?? defaultThemeMode;
  const resolvedLang  = userPrefs?.lang  ?? defaultLocale;
  // CAN-STATE-001: preserve the three-way distinction — `string` (active org),
  // `null` (authoritative personal mode / "be yourself"), `undefined` (server
  // value unavailable, e.g. unauthenticated or no Preferences key). Do NOT
  // collapse `null` and `undefined` with `?? null`: the provider relies on
  // `null` to clear a stale cached org, and `undefined` to fall back to the
  // cached value. `userPrefs?.asOrg` yields `string | null | undefined`.
  const resolvedOrg   = userPrefs?.asOrg;
  const allTranslations = getAllTranslations();
  const fallbackTranslations = allTranslations['en-US'];
  // Defensive normalization for the inline theme-flash script. `resolvedTheme`
  // is always 'dark' | 'light' (getDefaultThemeMode validates; userPrefs.theme is
  // typed 'dark' | 'light'), but we harden here so the value interpolated into
  // the nonce'd <script> can NEVER carry injected characters (XSS belt-and-
  // suspenders). This is the server-side default used when no theme is stored.
  const safeServerTheme: 'dark' | 'light' = resolvedTheme === 'light' ? 'light' : 'dark';
  const forceAnimationsClass =
    process.env.NEXT_PUBLIC_FORCE_ANIMATIONS === 'true' ? 'ldd-force-animations' : '';

  return (
    <html lang="en" data-theme="dark" className={forceAnimationsClass} suppressHydrationWarning>
      <head>
        {/*
          Theme flash prevention: reads theme from sessionStorage and applies it
          before React hydrates. Any DOM change here causes a hydration mismatch,
          which is why suppressHydrationWarning is on <html>. This is the ONLY
          expected source of mismatch.
          The nonce is provided by the middleware's per-request CSP (proxy.ts).

          BUG-002 fix: when no theme is stored, fall back to the server-resolved
          default (`safeServerTheme`) instead of `prefers-color-scheme`. The
          server renders `data-theme="dark"` and the post-hydration React effect
          (preferences.tsx) also converges to the server default, so using the
          OS preference here caused a visible light→dark flash for OS-light
          users on first visit. `safeServerTheme` is always 'dark' | 'light'.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var serverDefault = '${safeServerTheme}';
                var stored = window.sessionStorage.getItem('theme-mode');
                var valid = stored === 'dark' || stored === 'light' ? stored : null;
                if (valid) {
                  document.documentElement.setAttribute('data-theme', valid);
                } else {
                  document.documentElement.setAttribute('data-theme', serverDefault);
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${ibmPlexMono.variable} ${instrumentSerif.variable} ${dmSans.variable}`}>
        <MotionConfigProvider>
          <LogtoProvider
            userData={userData}
            dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
            initialTheme={resolvedTheme}
            initialLang={resolvedLang}
            initialOrgId={resolvedOrg}
            allTranslations={allTranslations}
            fallbackTranslations={fallbackTranslations}
          >
            <AuthWatcher />
            <SessionHeartbeat />
            {children}
            <LangSync />
          </LogtoProvider>
        </MotionConfigProvider>
      </body>
    </html>
  );
}
