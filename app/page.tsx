export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Dashboard } from './logto-kit/src';
import { SignedIn, SignedOut } from './logto-kit/src/components/handlers';
import { getTranslations, getMainLocale } from './logto-kit/src/locales';

function SignInPrompt() {
  const locale = getMainLocale();
  const t = getTranslations(locale);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
      }}
    >
      <div
        style={{
          background: '#050505',
          border: '1px solid #374151',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ color: '#d1d5db', marginBottom: '20px', fontFamily: 'var(--font-ibm-plex-mono)' }}>
          User Profile
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '30px', fontFamily: 'var(--font-ibm-plex-mono)', fontSize: '12px' }}>
          {t.dashboard.signInPrompt}
        </p>
        <a
          href="/api/auth/sign-in"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#1a1a1a',
            color: '#d1d5db',
            border: '1px solid #374151',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'var(--font-ibm-plex-mono)',
            textDecoration: 'none',
          }}
        >
          {t.dashboard.signInButton}
        </a>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#0a0a0a',
    }}>
      <span style={{ color: '#6b7280', fontFamily: 'monospace' }}>Loading...</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Suspense fallback={<DashboardSkeleton />}>
        <SignedIn>
          <Dashboard />
        </SignedIn>
      </Suspense>
      <Suspense fallback={null}>
        <SignedOut>
          <SignInPrompt />
        </SignedOut>
      </Suspense>
    </main>
  );
}
