import type { Metadata } from 'next';
import { IBM_Plex_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import AuthWatcher from './logto-kit/components/handlers/auth-watcher';
import { HeartbeatProvider } from './logto-kit/components/handlers/heartbeat-provider';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${ibmPlexMono.variable} ${instrumentSerif.variable}`}>
        <AuthWatcher />
        <HeartbeatProvider />
        {children}
      </body>
    </html>
  );
}
