'use client';

import { useCallback } from 'react';
import { Protected } from '../../../logto-kit/custom-logic';
import { useLogto } from '../../../logto-kit/components/providers/logto-provider';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { CalculatorClient } from './CalculatorClient';
import { LogIn } from 'lucide-react';

/** Shown when the user is unauthenticated — clicking it opens the auth prompt. */
function SignInToUseFallback({ routeTo }: { routeTo: string }) {
  const { openDashboard } = useLogto();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const handleClick = useCallback(() => {
    openDashboard({ routeTo });
  }, [openDashboard, routeTo]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        width: '340px',
        minHeight: '200px',
        background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        borderRadius: '4px',
        padding: '24px',
      }}
    >
      <p
        style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: '13px',
          color: isDark ? 'rgba(255,255,255,0.5)' : '#6b7280',
          textAlign: 'center',
          margin: 0,
        }}
      >
        Sign in to use the interactive calculator.
      </p>
      <button
        type="button"
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: '13px',
          fontWeight: 500,
          color: '#fff',
          background: isDark ? '#3b82f6' : '#2563eb',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        <LogIn size={14} strokeWidth={1.5} />
        Sign In
      </button>
    </div>
  );
}

export default function CalculatorPanel() {
  const { isAuthenticated } = useLogto();

  // When unauthenticated, render the sign-in fallback directly.
  // The Protected component handles the perm/org check for authenticated users.
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <SignInToUseFallback routeTo="/demo/calculator/live-calculator" />
      </div>
    );
  }

  return (
    <Protected
      orgId="5b6sw6p5uzti"
      perm="calc:basic"
      fallback={null}
    >
      <CalculatorClient />
    </Protected>
  );
}
