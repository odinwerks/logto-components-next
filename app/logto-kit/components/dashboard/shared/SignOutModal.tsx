import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AnimatePresence } from '../../shared/motion';
import type { ThemeColors } from '../types';
import type { Translations } from '../../../locales';
import { Overlay } from './FlowModal';
import { Button } from '../../shared/Button';
import { readEnv } from '../../../logic/env';
import { signOutUser } from '../../../logic/actions/auth';
import { useFocusTrap } from './focus-trap';
import { clientLog } from '../../../logic/client-logger';
import { useToast } from '../../providers/toast-provider';
import { withSessionActionLock } from '../../providers/session-heartbeat';
import { useScrollLock } from '../../../hooks/use-scroll-lock';

interface SignOutModalProps {
  isOpen: boolean;
  onAbort: () => void;
  countdownSeconds?: number;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}

// ── SignOutConfirm (Stage 1: countdown confirmation) ─────────────────────────
// Extracted into a child component so `useFocusTrap` runs on mount, when the
// dialog ref is already attached. The parent (SignOutModal) is always mounted
// in the tree, so calling the hook at the parent level left the ref null at the
// first effect run and the trap never installed (BUG-001). This mirrors the
// clean pattern used by FlowModal / PasswordVerifyModal / BackupCodesModal, all
// of which call `useFocusTrap` inside the conditionally-rendered modal body.
function SignOutConfirm({
  onAbort,
  onCancel,
  onConfirm,
  countdown,
  mode,
  colors,
  t,
}: {
  onAbort: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  countdown: number;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onAbort);
  useScrollLock();

  const [before, after] = t.signout.bodyCountdown.split('{n}');

  return (
    <motion.div
      key="confirm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.06, ease: 'easeOut' }}
    >
      <Overlay onDismiss={onCancel}>
        <div
          ref={dialogRef}
          tabIndex={-1}
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
          aria-labelledby="signout-modal-title"
          aria-describedby="signout-modal-desc"
        >
          <div
            style={{
              padding: '1.125rem 1.375rem 1rem',
              borderBottom: `1px solid ${colors.borderColor}`,
            }}
          >
            <p
              id="signout-modal-title"
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
              id="signout-modal-desc"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '0.875rem',
                fontWeight: 600,
                color: colors.textSecondary,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              <span aria-live="polite">
                {before}
                <strong style={{ fontSize: '1.125rem', fontWeight: 700 }}>{countdown}</strong>
                {after}
              </span>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
              <Button variant="secondary" onClick={onCancel} mode={mode} colors={colors}>
                {t.signout.abort}
              </Button>
              <Button variant="danger" onClick={onConfirm} mode={mode} colors={colors}>
                {t.signout.confirm}
              </Button>
            </div>
          </div>
        </div>
      </Overlay>
    </motion.div>
  );
}

// ── SignOutFarewell (Stage 2: sign-out success overlay) ──────────────────────
// Extracted child so the farewell focus trap installs on mount (BUG-001).
// Escape is intentionally a no-op while sign-out is in progress.
function SignOutFarewell({
  colors,
  t,
}: {
  colors: ThemeColors;
  t: Translations;
}) {
  const farewellRef = useRef<HTMLDivElement>(null);
  useFocusTrap(farewellRef, () => { /* farewell overlay: Escape is a no-op while sign-out is in progress */ });
  useScrollLock();

  return (
    <motion.div
      key="farewell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.06, ease: 'easeOut' }}
      ref={farewellRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.signout.farewell}
      tabIndex={-1}
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
        aria-label={t.signout.farewell}
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
    </motion.div>
  );
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
  const { showToast } = useToast();

  // Countdown expiry is a derived transition. Keeping it derived avoids an
  // extra render solely to synchronize state from the countdown.
  const farewellActive = showFarewell || (isOpen && countdown <= 0);

  useEffect(() => {
    // Reset state when transitioning from open to closed (not on initial render)
    if (prevIsOpenRef.current && !isOpen) {
      setCountdown(countdownSeconds);
      setShowFarewell(false);
    }
    prevIsOpenRef.current = isOpen;

    if (!isOpen) return;
    if (farewellActive) {
      // Read SIGNOUT_REDIRECT_DELAY for farewell overlay duration (default 1000)
      const rawFarewellDelay = parseInt(readEnv('SIGNOUT_REDIRECT_DELAY') || '1000', 10);
      const farewellDelayMs = Number.isFinite(rawFarewellDelay) && rawFarewellDelay >= 0 ? rawFarewellDelay : 1000;
      // Farewell stage: wait SIGNOUT_REDIRECT_DELAY then call signOutUser server action
      const timer = setTimeout(async () => {
        try {
          await withSessionActionLock('sign-out', signOutUser);
        } catch (err) {
          clientLog.error('SignOutModal', 'signOutUser failed:', err);
          showToast('error', t.dashboard.signOutFailed);
          setShowFarewell(false);
          setCountdown(countdownSeconds);
          onAbort();
        }
      }, farewellDelayMs);
      return () => clearTimeout(timer);
    }
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  // countdown intentionally omitted: functional updater form `c => c - 1` captures no
  // stale state, and the guard above (`countdown <= 0`) is evaluated on the render that
  // produced the latest countdown value.  Keeping countdown in deps would tear down and
  // recreate the interval every second, causing jitter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, countdownSeconds, farewellActive]);

  const handleAbort = () => {
    setCountdown(countdownSeconds);
    setShowFarewell(false);
    onAbort();
  };

  const handleConfirm = () => {
    setShowFarewell(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="sync">
      {farewellActive ? (
        <SignOutFarewell key="farewell" colors={colors} t={t} />
      ) : (
        <SignOutConfirm
          key="confirm"
          onAbort={onAbort}
          onCancel={handleAbort}
          onConfirm={handleConfirm}
          countdown={countdown}
          mode={mode}
          colors={colors}
          t={t}
        />
      )}
    </AnimatePresence>
  );
}
