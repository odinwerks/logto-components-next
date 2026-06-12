import React, { useEffect } from 'react';
import type { ThemeColors } from '../types';
import { readEnv } from '../../../logic/env';

interface FarewellOverlayProps {
  message: string;
  colors: ThemeColors;
  delayMs?: number;
  onComplete?: () => void;
}

export function FarewellOverlay({ message, colors, delayMs, onComplete }: FarewellOverlayProps) {
  const rawDelay = delayMs ?? parseInt(readEnv('DELETE_REDIRECT_DELAY') || '3000', 10);
  const effectiveDelay = Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 3000;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        window.location.href = '/';
      }
    }, effectiveDelay);
    return () => clearTimeout(timer);
  }, [effectiveDelay, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(0.375rem) saturate(0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <p
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '1.75rem',
          fontWeight: 700,
          color: colors.textPrimary,
          textAlign: 'center',
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}
