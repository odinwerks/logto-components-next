import type { Metadata } from 'next';
import { IBM_Plex_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import AuthWatcher from './logto-kit/components/handlers/auth-watcher';

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

export const metadata: Metadata = {
  title: 'Logto Debug Dashboard',
  description: 'Debug dashboard for Logto authentication',
};

const themeScript = `
(function() {
  try {
    var stored = sessionStorage.getItem('theme-mode');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    } else {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${ibmPlexMono.variable} ${instrumentSerif.variable}`}>
        <AuthWatcher />
        {children}
      </body>
    </html>
  );
}
