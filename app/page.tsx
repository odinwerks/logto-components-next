'use client';

import { useLogto } from './logto-kit/components/providers/logto-provider';
import { UserButton } from './logto-kit/components/UserButton';

/**
 * Landing page — accessible without authentication.
 *
 * Unauthenticated visitors see an anonymous UserButton and can click the
 * "View Docs" / "Go to Dashboard" buttons to trigger the sign-in modal.
 * Authenticated users can also click the UserButton to open their dashboard.
 *
 * Direct URL access to protected routes (docs, settings, etc.) is handled
 * at the proxy layer: unauthenticated users are redirected to sign-in.
 */
export default function HomePage() {
  const { isAuthenticated, openDashboard } = useLogto();

  const handleProtectedNav = (path: string) => {
    if (isAuthenticated) {
      window.location.href = path;
    } else {
      openDashboard({ routeTo: path });
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        padding: '2rem',
        fontFamily: 'var(--font-dm-sans, sans-serif)',
      }}
    >
      {/* User button — anonymous avatar when unauthenticated, opens auth modal on click */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <UserButton Size="2.5rem" />
      </div>

      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
          }}
        >
          Logto Components Kit
        </h1>
        <p
          style={{
            fontSize: '1rem',
            opacity: 0.6,
            marginBottom: '2rem',
            lineHeight: 1.6,
          }}
        >
          A modular Next.js base for building with Logto authentication — dashboard,
          user management, RBAC, MFA, and more.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Demo is public — direct link is safe */}
          <a
            href="/demo"
            style={{
              padding: '0.625rem 1.25rem',
              border: '1px solid currentColor',
              borderRadius: '0.25rem',
              textDecoration: 'none',
              opacity: 0.8,
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            View Demo
          </a>

          {/* Protected route — triggers auth modal when unauthenticated */}
          <button
            onClick={() => handleProtectedNav('/getting-started/pre-requisites')}
            style={{
              padding: '0.625rem 1.25rem',
              border: '1px solid currentColor',
              borderRadius: '0.25rem',
              background: 'transparent',
              cursor: 'pointer',
              opacity: 0.8,
              fontSize: '0.9rem',
              fontWeight: 500,
              fontFamily: 'inherit',
              color: 'inherit',
            }}
          >
            Documentation
          </button>
        </div>
      </div>
    </main>
  );
}
