'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { DARK_COLORS, FONT_MONO } from '../logto-kit/themes';

export function DocsErrorFallback({ message }: { message: string }) {
  const router = useRouter();

  const handleRetry = useCallback(() => {
    router.refresh();
  }, [router]);

  const colors = DARK_COLORS;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bgPage,
        color: colors.textPrimary,
        fontFamily: FONT_MONO,
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          background: colors.bgSecondary,
          border: `1px solid ${colors.borderColor}`,
          borderRadius: '0.5rem',
          padding: '1.875rem',
          maxWidth: '31.25rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: colors.accentRed }}>
          Error
        </h1>
        <p style={{ fontSize: '0.75rem', color: colors.textTertiary, marginBottom: '1.25rem' }}>
          {message}
        </p>
        <button
          onClick={handleRetry}
          style={{
            fontFamily: FONT_MONO,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '0.5rem 1.25rem',
            borderRadius: '0.375rem',
            border: `1px solid ${colors.borderColor}`,
            background: colors.bgTertiary,
            color: colors.textPrimary,
            cursor: 'pointer',
            transition: 'background 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.accentBlue;
            e.currentTarget.style.borderColor = colors.accentBlue;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.bgTertiary;
            e.currentTarget.style.borderColor = colors.borderColor;
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
