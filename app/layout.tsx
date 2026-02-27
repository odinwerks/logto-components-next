import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import AuthWatcher from './logto-kit/src/components/auth-watcher';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

export const metadata: Metadata = {
  title: 'Logto Debug Dashboard',
  description: 'Debug dashboard for Logto authentication',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={ibmPlexMono.variable}>
        <AuthWatcher />
        {children}
      </body>
    </html>
  );
}
