import React, { useState, useEffect, useRef } from 'react';
import type { ThemeColors } from '../types';
import type { Translations } from '../../../locales';
import { Overlay } from './FlowModal';
import { Button } from '../../shared/Button';
import { readEnv } from '../../../logic/env';

interface SignOutModalProps {
  isOpen: boolean;
  onAbort: () => void;
  countdownSeconds?: number;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}

export function SignOutModal({
  isOpen,
  onAbort,
  countdownSeconds = 8,
  mode,
  colors,
  t,
}: SignOutModalProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [showFarewell, setShowFarewell] = useState(false);
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    // Reset state when transitioning from open to closed (not on initial render)
    if (prevIsOpenRef.current && !isOpen) {
      setCountdown(countdownSeconds);
      setShowFarewell(false);
    }
    prevIsOpenRef.current = isOpen;

    if (!isOpen) return;
    if (showFarewell) {
      // Read SIGNOUT_REDIRECT_DELAY for farewell overlay duration (default 3000)
      const rawFarewellDelay = parseInt(readEnv('SIGNOUT_REDIRECT_DELAY') || '3000', 10);
      const farewellDelayMs = Number.isFinite(rawFarewellDelay) && rawFarewellDelay >= 0 ? rawFarewellDelay : 3000;
      // Farewell stage: wait SIGNOUT_REDIRECT_DELAY then POST to sign-out route
      const timer = setTimeout(() => {
        fetch('/api/auth/sign-out', { method: 'POST', redirect: 'manual' })
          .then(() => {
            window.location.href = '/';
          })
          .catch(() => {
            window.location.href = '/';
          });
      }, farewellDelayMs);
      return () => clearTimeout(timer);
    }
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        const next = c - 1;
        if (next <= 0) setShowFarewell(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown, countdownSeconds, showFarewell]);

  if (!isOpen) return null;

  const handleAbort = () => {
    setCountdown(countdownSeconds);
    setShowFarewell(false);
    onAbort();
  };

  const handleConfirm = () => {
    setShowFarewell(true);
  };

  // Stage 2: Farewell overlay (no title, no buttons, large centered text)
  if (showFarewell) {
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
          {t.signout.farewell}
        </p>
      </div>
    );
  }

  // Stage 1: Countdown confirmation
  const bodyText = t.signout.bodyCountdown.replace('{n}', String(countdown));
  const parts = bodyText.split(String(countdown));

  return (
    <Overlay onDismiss={handleAbort}>
      <div
        style={{
          width: '100%',
          maxWidth: '27.5rem',
          background: colors.bgSecondary,
          border: `1px solid ${colors.borderColor}`,
          boxShadow: '0 2rem 5rem rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            padding: '1.125rem 1.375rem 1rem',
            borderBottom: `1px solid ${colors.borderColor}`,
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: colors.textPrimary,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {t.signout.title}
          </p>
        </div>

        <div style={{ padding: '1.25rem 1.375rem' }}>
          <p
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '0.875rem',
              fontWeight: 600,
              color: colors.textSecondary,
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {parts[0]}
            <strong style={{ fontSize: '1.125rem', fontWeight: 700 }}>{countdown}</strong>
            {parts[1] || ''}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
            <Button variant="secondary" onClick={handleAbort} mode={mode} colors={colors}>
              {t.signout.abort}
            </Button>
            <Button variant="danger" onClick={handleConfirm} mode={mode} colors={colors}>
              {t.signout.confirm}
            </Button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
